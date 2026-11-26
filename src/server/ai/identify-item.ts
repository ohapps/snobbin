import { generateObject } from "ai";
import { z } from "zod";
import { getItemModel, getWebSearchProviderOptions } from "./item-model";
import { ITEM_KINDS, ItemKind } from "./image-candidates";

/**
 * "Identify with AI": works out an item's name and attribute values from a
 * photo or from what the user typed.
 */

export interface IdentifyAttribute {
  id: string;
  name: string;
  existingValues: string[];
}

export interface IdentifyContext {
  groupName: string;
  groupDescription: string;
  attributes: IdentifyAttribute[];
}

export interface IdentifiedItem {
  description: string;
  attributes: { id: string; value: string }[];
}

export interface IdentifiedFromText extends IdentifiedItem {
  kind: ItemKind;
  creator?: string;
  year?: string;
  imageSearchQueries: string[];
}

const attributesSchema = z.array(
  z.object({
    id: z.string().describe("The attribute ID from the request"),
    value: z
      .string()
      .describe(
        "The value for this attribute. Prefer an existing value if the item matches; empty string if unknown",
      ),
  }),
);

const descriptionSchema = z
  .string()
  .describe(
    "The item's specific name or title only (max 100 characters), e.g. 'Ted Lasso', 'Two Hearted Ale'. Not a sentence.",
  );

const ImageSchema = z.object({
  description: descriptionSchema,
  attributes: attributesSchema,
});

const TextSchema = z.object({
  description: descriptionSchema,
  kind: z
    .enum(ITEM_KINDS)
    .describe("What sort of thing the item is (drink covers beer, wine…)"),
  creator: z
    .string()
    .describe(
      "Main author, director, artist, brewery or maker, or empty string",
    ),
  year: z
    .string()
    .describe("Release, publication or first-air year (YYYY), or empty string"),
  imageSearchQueries: z
    .array(z.string())
    .describe(
      "1-3 Wikipedia/Wikimedia search phrases that find a picture of this exact item (cover, poster, bottle, label), most specific first, e.g. 'Stick (TV series)', 'Two Hearted Ale'",
    ),
  attributes: attributesSchema,
});

export const describeAttributes = (attributes: IdentifyAttribute[]) =>
  attributes
    .map((attr) => {
      const existing =
        attr.existingValues.length > 0
          ? `Existing values: [${attr.existingValues
              .slice(0, 50)
              .map((v) => JSON.stringify(v))
              .join(", ")}]. Prefer one of these if the item matches.`
          : "No existing values yet.";
      return `- ${attr.name} (id: "${attr.id}"): ${existing}`;
    })
    .join("\n");

const groupIntro = ({ groupName, groupDescription }: IdentifyContext) =>
  `You are identifying an item for a ranking/review group.

Group name: ${JSON.stringify(groupName)}
Group description: ${JSON.stringify(groupDescription)}`;

const descriptionRule = `The description is the item's specific name or title (max 100 characters). Do NOT include information already captured by one of the attributes (e.g. leave out the brewery if "Brewery" is an attribute). No citations or links.`;

export const buildImagePrompt = (
  context: IdentifyContext,
) => `${groupIntro(context)}

Identify the item in this image and provide:
1. A description. ${descriptionRule}
2. Values for each attribute below. Use an existing value when the item clearly matches one, otherwise an accurate new value.

Attributes:
${describeAttributes(context.attributes)}

Return the attribute IDs exactly as provided.`;

export const buildTextPrompt = (
  context: IdentifyContext,
  query: string,
) => `${groupIntro(context)}

The user typed: ${JSON.stringify(query)}
Work out which specific item they mean. It belongs in this group, so prefer the interpretation that fits the group (e.g. in a TV group, "Stick" is a TV series). If the text names a person, it's usually someone involved in the item, not the item itself.

Provide:
1. A description. ${descriptionRule}
2. The kind of item, its main creator and year.
3. Search phrases to find a picture of it.
4. Values for each attribute below. Use an existing value when the item clearly matches one, otherwise an accurate new value. Use an empty string when you don't know.

Attributes:
${describeAttributes(context.attributes)}

Return the attribute IDs exactly as provided.`;

/** Strips citation links like "[apple.com](https://…)" and trims to length. */
export const cleanAiText = (value: string, max = 100): string =>
  value
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "")
    .replace(/\s*\[[a-z0-9.-]+\.[a-z]{2,}\]/gi, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max)
    .trim();

const cleanAttributes = (
  attributes: { id: string; value: string }[],
  context: IdentifyContext,
) => {
  const validIds = new Set(context.attributes.map((a) => a.id));
  return attributes
    .filter((a) => validIds.has(a.id))
    .map((a) => ({ id: a.id, value: cleanAiText(a.value, 255) }))
    .filter((a) => a.value);
};

/**
 * AI models only take common image formats, but Cloudinary keeps uploads in
 * their original format (JPEG XL, HEIC, AVIF…). For Cloudinary images, ask for
 * a JPEG copy capped at 1600px, which is also quicker to send. Other URLs are
 * returned unchanged.
 */
export const toAiImageUrl = (imageUrl: string): string => {
  let url: URL;
  try {
    url = new URL(imageUrl);
  } catch {
    return imageUrl;
  }
  const marker = "/image/upload/";
  const at = url.pathname.indexOf(marker);
  if (url.hostname !== "res.cloudinary.com" || at === -1) return imageUrl;

  const prefix = url.pathname.slice(0, at + marker.length);
  const rest = url.pathname
    .slice(at + marker.length)
    // Swap the extension, which also selects the delivered format.
    .replace(/\.[a-z0-9]+$/i, "")
    .concat(".jpg");
  url.pathname = `${prefix}f_jpg,q_auto,w_1600,c_limit/${rest}`;
  url.protocol = "https:";
  return url.toString();
};

export const identifyFromImage = async (
  imageUrl: string,
  context: IdentifyContext,
): Promise<IdentifiedItem> => {
  const result = await generateObject({
    model: getItemModel(),
    schema: ImageSchema,
    abortSignal: AbortSignal.timeout(30_000),
    messages: [
      {
        role: "user",
        content: [
          { type: "image", image: new URL(toAiImageUrl(imageUrl)) },
          { type: "text", text: buildImagePrompt(context) },
        ],
      },
    ],
  });
  return {
    description: cleanAiText(result.object.description),
    attributes: cleanAttributes(result.object.attributes, context),
  };
};

export const identifyFromText = async (
  query: string,
  context: IdentifyContext,
): Promise<IdentifiedFromText> => {
  const prompt = buildTextPrompt(context, query);
  const run = (
    providerOptions?: ReturnType<typeof getWebSearchProviderOptions>,
  ) =>
    generateObject({
      model: getItemModel(),
      schema: TextSchema,
      prompt,
      abortSignal: AbortSignal.timeout(20_000),
      providerOptions: providerOptions as never,
    });

  const webSearch = getWebSearchProviderOptions();
  let result;
  try {
    result = await run(webSearch);
  } catch (err) {
    // A web search hiccup shouldn't sink the whole lookup.
    if (!webSearch) throw err;
    console.warn("Identify with web search failed, retrying without:", err);
    result = await run(undefined);
  }

  const data = result.object;
  return {
    description: cleanAiText(data.description) || cleanAiText(query),
    kind: data.kind,
    creator: cleanAiText(data.creator) || undefined,
    year: /^\d{4}$/.test(data.year.trim()) ? data.year.trim() : undefined,
    imageSearchQueries: data.imageSearchQueries
      .map((q) => cleanAiText(q))
      .filter(Boolean)
      .slice(0, 3),
    attributes: cleanAttributes(data.attributes, context),
  };
};

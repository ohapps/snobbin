import { describe, it, expect } from "vitest";
import { parseAttributeFilters, toLikePattern } from "../mappers";

describe("offline mappers", () => {
  describe("parseAttributeFilters", () => {
    it("extracts attr_* params into attribute-id keyed filters", () => {
      const result = parseAttributeFilters({
        page: "2",
        keyword: "latte",
        attr_colour: "red",
        attr_size: "large",
      });

      expect(result).toEqual({ colour: "red", size: "large" });
    });

    it("ignores empty attribute values and non-attr params", () => {
      const result = parseAttributeFilters({
        attr_colour: "",
        sortBy: "RANKING",
        attr_size: "large",
      });

      expect(result).toEqual({ size: "large" });
    });

    it("returns an empty object when there are no attribute filters", () => {
      expect(parseAttributeFilters({ page: "1" })).toEqual({});
    });
  });

  describe("toLikePattern", () => {
    it("wraps and lower-cases the keyword to mimic ILIKE", () => {
      expect(toLikePattern("Latte")).toBe("%latte%");
    });

    it("preserves interior characters", () => {
      expect(toLikePattern("Flat White")).toBe("%flat white%");
    });
  });
});

import { RankingItemAttribute } from '@/types/rankings';
import {
  SnobGroupAttribute,
  SnobGroupAttributeSummary,
} from '@/types/snobGroup';
import { Autocomplete, styled, TextField } from '@mui/material';

const StyledTextField = styled(TextField)(() => ({
  marginTop: '10px',
  marginBottom: '10px',
}));

const ItemAttributes = ({
  groupAttributes,
  itemAttributes,
  setItemAttributes,
  snobGroupAttributes,
}: {
  groupAttributes: SnobGroupAttribute[];
  itemAttributes: RankingItemAttribute[];
  setItemAttributes: (attributes: RankingItemAttribute[]) => void;
  snobGroupAttributes: SnobGroupAttributeSummary[];
}) => {
  const getOptions = (id: string) => {
    return snobGroupAttributes
      .filter((attr) => attr.attributeId === id)
      .map((attr) => attr.attributeValue);
  };

  const getAttributeValue = (id: string) => {
    return (
      itemAttributes?.find((attr) => attr.attributeId === id)?.attributeValue ??
      ''
    );
  };

  const setAttributeValue = (id: string, value: string) => {
    const existingAttribute = itemAttributes?.find(
      (attr) => attr.attributeId === id
    );
    if (existingAttribute) {
      const otherAttributes = itemAttributes?.filter(
        (attr) => attr.attributeId !== id
      );
      setItemAttributes([
        ...otherAttributes,
        {
          ...existingAttribute,
          attributeValue: value,
        },
      ]);
    } else {
      setItemAttributes([
        ...itemAttributes,
        { id: '', attributeId: id, attributeValue: value },
      ]);
    }
  };

  return (
    <>
      {groupAttributes.map((attribute) => (
        <Autocomplete
          freeSolo
          key={attribute.id}
          id={attribute.id}
          value={getAttributeValue(attribute.id ?? '')}
          onChange={(
            event: React.SyntheticEvent<Element, Event>,
            newValue: string | null
          ) => {
            setAttributeValue(attribute.id ?? '', newValue ?? '');
          }}
          inputValue={getAttributeValue(attribute.id ?? '')}
          onInputChange={(event, newInputValue) => {
            setAttributeValue(attribute.id ?? '', newInputValue ?? '');
          }}
          options={getOptions(attribute.id ?? '')}
          fullWidth
          renderInput={(params) => (
            <StyledTextField {...params} label={attribute.name} />
          )}
        />
      ))}
    </>
  );
};

export default ItemAttributes;

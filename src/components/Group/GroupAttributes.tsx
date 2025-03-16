import {
  Box,
  IconButton,
  InputAdornment,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  TextField,
  styled,
} from '@mui/material';
import { useState } from 'react';
import SaveIcon from '@mui/icons-material/Check';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import { SnobGroupAttribute } from '@/types/snobGroup';
import { useFormContext } from 'react-hook-form';
import { generateNewId } from '@/utils/generate-new-id';

const StyledTextField = styled(TextField)(() => ({
  marginTop: '10px',
  marginBottom: '10px',
}));

const AttributeList = styled(List)(({ theme }) => ({
  border: '1px solid ' + theme.palette.grey[400],
  borderRadius: '5px',
  height: '210px',
  overflowY: 'auto',
}));

const AttributeItem = styled(ListItem)(() => ({
  padding: '0px 10px 0px 10px',
}));

const newAttribute = (): SnobGroupAttribute => {
  return {
    id: generateNewId(),
    name: '',
  };
};

const GroupAttributes = () => {
  const { watch, setValue } = useFormContext();
  const groupAttributes = watch('attributes') as SnobGroupAttribute[];
  const [selectedAttribute, setSelectedAttribute] =
    useState<SnobGroupAttribute>(newAttribute());

  const handleSave = () => {
    const newAttributes = groupAttributes.filter(
      (attribute) =>
        attribute.id === '' || attribute.id !== selectedAttribute.id
    );
    setValue('attributes', [...newAttributes, selectedAttribute]);
    setSelectedAttribute(newAttribute());
  };

  const handleDelete = (attribute: SnobGroupAttribute) => {
    setValue(
      'attributes',
      groupAttributes.filter(
        (attr) => !(attr.id === attribute.id && attr.name === attribute.name)
      )
    );
  };

  return (
    <Box>
      <StyledTextField
        label="Attribute Name"
        value={selectedAttribute.name}
        fullWidth
        onChange={(e) =>
          setSelectedAttribute({ ...selectedAttribute, name: e.target.value })
        }
        InputProps={{
          endAdornment: (
            <InputAdornment position="end">
              <IconButton
                aria-label="save attribute"
                disabled={selectedAttribute.name === ''}
                onClick={handleSave}
                edge="end"
              >
                <SaveIcon />
              </IconButton>
            </InputAdornment>
          ),
        }}
      />
      <AttributeList>
        {groupAttributes.map((attribute) => (
          <AttributeItem
            key={`attribute-${attribute.id}-${attribute.name}`}
            secondaryAction={
              <IconButton
                edge="end"
                aria-label="delete"
                onClick={() => handleDelete(attribute)}
              >
                <DeleteIcon />
              </IconButton>
            }
          >
            <ListItemIcon>
              <IconButton
                aria-label="edit"
                onClick={() => setSelectedAttribute(attribute)}
              >
                <EditIcon />
              </IconButton>
            </ListItemIcon>
            <ListItemText>{attribute.name}</ListItemText>
          </AttributeItem>
        ))}
      </AttributeList>
    </Box>
  );
};

export default GroupAttributes;

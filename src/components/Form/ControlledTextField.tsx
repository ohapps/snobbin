import { styled, TextField, TextFieldProps } from "@mui/material";
import { Controller, useFormContext } from "react-hook-form";

const StyledTextField = styled(TextField)(({ theme }) => ({
  marginTop: theme.spacing(1.5),
  marginBottom: theme.spacing(1.5),
}));

export type ControlledTextFieldProps = {
  name: string;
} & TextFieldProps;

const ControlledTextField = ({ name, ...rest }: ControlledTextFieldProps) => {
  const {
    control,
    formState: { errors },
  } = useFormContext();
  return (
    <Controller
      name={name}
      control={control}
      render={({ field }) => (
        <StyledTextField
          fullWidth
          variant="outlined"
          autoCapitalize="off"
          helperText={errors[name]?.message as string}
          error={!!errors[name]}
          {...rest}
          {...field}
        />
      )}
    />
  );
};

export default ControlledTextField;

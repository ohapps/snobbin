import {
  FormControl,
  InputLabel,
  Select,
  SelectProps,
  styled,
} from "@mui/material";
import { useId } from "react";
import { Controller, useFormContext } from "react-hook-form";

const StyledFormControl = styled(FormControl)(({ theme }) => ({
  marginTop: theme.spacing(1.5),
  marginBottom: theme.spacing(1.5),
}));

type ControlledSelectProps = {
  label: string;
  name: string;
} & SelectProps;

const ControlledSelect = ({ name, label, ...rest }: ControlledSelectProps) => {
  const {
    control,
    formState: { errors },
  } = useFormContext();
  const id = useId();
  return (
    <Controller
      name={name}
      control={control}
      render={({ field }) => {
        return (
          <StyledFormControl fullWidth>
            <InputLabel id={id}>{label}</InputLabel>
            <Select
              id={id}
              label={label}
              fullWidth
              variant="outlined"
              {...rest}
              {...field}
              error={!!errors[name]}
            />
          </StyledFormControl>
        );
      }}
    />
  );
};

export default ControlledSelect;

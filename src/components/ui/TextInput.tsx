import "./TextInput.css";

import {CenterAligningDiv} from "./CenterAligningDiv";

type TextInputProps = {
  minLength?: number;
  maxLength: number;
  errorMessage: string;
  ariaLabel?: string;
  onChange?: React.ChangeEventHandler<HTMLInputElement>;
  placeholder?: string;
  value: string;
  disabled?: boolean;
};

export function TextInput({
  minLength = 1,
  maxLength,
  errorMessage,
  ariaLabel,
  onChange,
  placeholder,
  value,
  disabled = false,
}: TextInputProps) {
  return (
    <CenterAligningDiv>
      <span className="text-input-note">
        ※{minLength}文字以上{maxLength}
        文字以下の<br></br>半角英数字・平仮名・片仮名・漢字でのみ入力可能
      </span>
      <input
        className="text-input"
        type="text"
        maxLength={maxLength}
        aria-label={ariaLabel}
        onChange={onChange}
        placeholder={placeholder}
        value={value}
        disabled={disabled}
      />
      {errorMessage && <p className="error-massage">{errorMessage}</p>}
    </CenterAligningDiv>
  );
}

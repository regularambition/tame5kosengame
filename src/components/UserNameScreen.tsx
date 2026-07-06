import {useState} from "react";

import {isValidUserName, USER_NAME_RULES} from "@tame5kosengame/shared";
import {Button} from "./ui/Button";
import {BackArrowButton} from "./ui/BackArrowButton";
import {ScreenBanner} from "./ui/ScreenBanner";
import {SCREEN_NAMES} from "../constants/screenNames";
import {TextInput} from "./ui/TextInput";

import "./UserNameScreen.css";

type UserNameScreenProps = {
  isUpdate: boolean;
  onSubmit: (name: string) => Promise<void>;
  onBack: () => void;
};

export function UserNameScreen({isUpdate, onSubmit, onBack}: UserNameScreenProps) {
  const [name, setName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleChange: React.ChangeEventHandler<HTMLInputElement> = (event) => {
    const nextName = event.target.value.slice(0, USER_NAME_RULES.MAX_LENGTH);
    setName(nextName);
    setError("");
  };

  const handleSubmit = async () => {
    console.log("called handleSubmit");
    if (!isValidUserName(name)) {
      setError(
        `${USER_NAME_RULES.MIN_LENGTH}文字以上${USER_NAME_RULES.MAX_LENGTH}文字以下の半角英数字で入力してください`,
      );
      return;
    }

    try {
      setIsSubmitting(true);
      await onSubmit(name);
    } catch {
      setError("登録に失敗しました。もう一度お試しください");
      setIsSubmitting(false);
    }
  };

  return (
    <main className="screen centering not-playing-text-general">
      <ScreenBanner s={SCREEN_NAMES.USER_NAME} />
      {isUpdate && <BackArrowButton onClick={onBack} />}
      <TextInput
        maxLength={USER_NAME_RULES.MAX_LENGTH}
        errorMessage={error}
        aria-label="ユーザー名"
        onChange={handleChange}
        placeholder={isUpdate ? "入力値が空でない場合のみ更新されます" : ""}
        value={name}
        disabled={isSubmitting}
      />
      <Button disabled={isSubmitting} onClick={async () => await handleSubmit()}>
        決定
      </Button>
    </main>
  );
}

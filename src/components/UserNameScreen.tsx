import {useState} from "react";

import {isValidUserName, USER_NAME_RULES} from "@tame5kosengame/shared";
import {Button} from "./ui/Button";
import {BackArrowButton} from "./ui/BackArrowButton";
import {ScreenBanner} from "./ui/ScreenBanner";
import {SCREEN_NAMES} from "../constants/screenNames";
import {TextInput} from "./ui/TextInput";
import {AnnotationText} from "./ui/AnnotationText";

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
      setError("入力が不正です");
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
    <main className="screen using-full-height vertical-alignment horizontal-centering vertical-centering not-playing-text-general">
      <ScreenBanner s={SCREEN_NAMES.USER_NAME} />
      {isUpdate && <BackArrowButton onClick={onBack} />}
      <p>ユーザー名を入力</p>
      <AnnotationText>
        ※{USER_NAME_RULES.MAX_LENGTH}文字以下の半角英数字・平仮名・片仮名・漢字のみ
      </AnnotationText>
      <TextInput
        maxLength={USER_NAME_RULES.MAX_LENGTH}
        onChange={handleChange}
        placeholder={isUpdate ? "入力値が空でない場合のみ更新されます" : ""}
        value={name}
        disabled={isSubmitting}
      />
      {error && <AnnotationText>{error}</AnnotationText>}
      <Button disabled={isSubmitting} onClick={async () => await handleSubmit()}>
        決定
      </Button>
    </main>
  );
}

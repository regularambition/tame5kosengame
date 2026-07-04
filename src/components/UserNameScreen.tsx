import {useState} from "react";

import {isValidUserName, USER_NAME_RULES} from "@tame5kosengame/shared";
import {Button} from "./ui/Button";
import "./UserNameScreen.css";

type UserNameScreenProps = {
  onSubmit: (name: string) => Promise<void>;
};

export function UserNameScreen({onSubmit}: UserNameScreenProps) {
  const [name, setName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleChange: React.ChangeEventHandler<HTMLInputElement> = (event) => {
    const nextName = event.target.value.slice(0, USER_NAME_RULES.MAX_LENGTH);
    setName(nextName);
    setError("");
  };

  const handleSubmit: React.SubmitEventHandler<HTMLFormElement> = async (event) => {
    event.preventDefault();

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
    <main className="screen user-name-screen">
      <form className="user-name-form" onSubmit={handleSubmit}>
        <h1 className="user-name-title">ユーザー名を入力</h1>
        <p className="user-name-note">
          ※{USER_NAME_RULES.MAX_LENGTH}文字以内の半角英大文字・小文字・
          <br />
          アラビア数字でのみ入力可能
        </p>
        <input
          aria-label="ユーザー名"
          className="user-name-input"
          disabled={isSubmitting}
          maxLength={USER_NAME_RULES.MAX_LENGTH}
          onChange={handleChange}
          type="text"
          value={name}
        />
        {error && <p className="user-name-error">{error}</p>}
        <Button disabled={isSubmitting}>決定</Button>
        {/* <button className="user-name-submit" disabled={isSubmitting} type="submit">
          決定
        </button> */}
      </form>
    </main>
  );
}

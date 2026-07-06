type GameRuleDescriptionProps = {
  winningPoint?: number;
  thinkingTime?: number;
};

export function GameRuleDescription({
  winningPoint = 5,
  thinkingTime = 5,
}: GameRuleDescriptionProps) {
  return (
    <p>
      {winningPoint}点先取で勝ち<br></br>毎ターンの思考時間は{thinkingTime}秒
    </p>
  );
}

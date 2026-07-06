import "./PagingUiRow.css";

import {IconButton} from "./IconButton";

import pagingLeftIcon from "../../assets/ui/pagingLeftIcon.png";
import pagingRightIcon from "../../assets/ui/pagingRightIcon.png";

type PagingUiRowProps = {
  pageIndex: number;
  pageCount: number;
  onClickLeft: () => void;
  onClickRight: () => void;
};

export function PagingUiRow({pageIndex, pageCount, onClickLeft, onClickRight}: PagingUiRowProps) {
  return (
    <div className="paging-ui">
      <IconButton
        iconSrc={pagingLeftIcon}
        label="1ページ戻る"
        onClick={onClickLeft}
        disabled={pageIndex === 0}
      />
      <span>
        {pageIndex + 1} / {pageCount}
      </span>
      <IconButton
        iconSrc={pagingRightIcon}
        label="1ページ進む"
        onClick={onClickRight}
        disabled={pageIndex === pageCount - 1}
      />
    </div>
  );
}

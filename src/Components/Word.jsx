import React from "react";
//https://romainmarcedesj.github.io/read2learnkanji


export default function Word(props) {
  //console.log("word dificulty of ", props.kanji, " is ", props.kanjiDifficulty);
  if (props.type === "word") {
    return (
      <span onClick={() => props.handleSwipe(props.id)}>
        {props.showFurigana && !props.showTranslation
          ? <ruby>{props.kanji}<rt>{props.furigana}</rt></ruby>
        : 
            props.showFurigana && props.showTranslation ? 
                  <ruby>{props.kanji}<rt>{props.furigana}, {props.translation}</rt></ruby> 
        :
           props.kanji}
      </span>
    );
  } else {
    return <span>{props.value}</span>;
  }
}


/**
// simple version to test basic function
export default function Word(props) {
  return (
    <span onClick={() => props.handleSwipe(props.id)}>
      {props.kanji}
      
    </span>
  );
}
**/
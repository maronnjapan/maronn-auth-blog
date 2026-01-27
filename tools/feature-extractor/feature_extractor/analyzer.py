"""janome を使った形態素解析によるキーワード抽出。"""

import re
from collections import Counter

from janome.tokenizer import Tokenizer

# キーワードとして抽出する品詞
_KEYWORD_POS = {"名詞", "動詞", "形容詞"}

# 除外する品詞細分類
_EXCLUDE_POS_DETAIL = {
    "非自立",
    "代名詞",
    "接尾",
    "数",
    "接続詞的",
    "特殊",
}

# 日本語ストップワード（助詞・助動詞は品詞フィルタで除外されるため、
# ここでは頻出だが意味の薄い自立語を列挙）
_STOP_WORDS = frozenset(
    {
        "する",
        "いる",
        "ある",
        "なる",
        "れる",
        "られる",
        "こと",
        "もの",
        "ため",
        "よう",
        "それ",
        "これ",
        "ここ",
        "そこ",
        "どこ",
        "の",
        "ん",
        "さ",
        "て",
        "で",
        "に",
        "を",
        "は",
        "が",
        "と",
        "も",
        "や",
        "か",
        "し",
        "等",
        "的",
        "性",
        "化",
        "用",
        "方",
        "上",
        "下",
        "中",
        "内",
        "外",
        "前",
        "後",
        "間",
        "時",
        "場合",
        "必要",
        "可能",
        "以下",
        "以上",
        "そう",
        "どう",
        "この",
        "その",
        "あの",
        "どの",
    }
)

# 英語ストップワード（形態素解析器が名詞として拾ってしまうもの）
_ENGLISH_STOP_WORDS = frozenset(
    {
        "a", "an", "the", "is", "are", "was", "were", "be",
        "for", "of", "in", "on", "at", "to", "by", "with",
        "and", "or", "not", "no", "it", "its", "as",
    }
)

# 記号のみで構成されるトークンを除外するパターン
_SYMBOL_ONLY = re.compile(r"^[^\w]+$", re.UNICODE)

# Tokenizer はインスタンス生成コストが高いため再利用する
_tokenizer: Tokenizer | None = None


def _get_tokenizer() -> Tokenizer:
    global _tokenizer
    if _tokenizer is None:
        _tokenizer = Tokenizer()
    return _tokenizer


def extract_keywords(
    text: str,
    max_keywords: int = 30,
) -> list[dict]:
    """テキストから形態素解析を用いてキーワードを抽出する。

    Returns:
        出現頻度降順のキーワードリスト。各要素は
        {"word": str, "reading": str, "pos": str, "count": int}
    """
    tokenizer = _get_tokenizer()
    counter: Counter[str] = Counter()
    token_info: dict[str, dict] = {}

    for token in tokenizer.tokenize(text):
        parts = token.part_of_speech.split(",")
        pos = parts[0]
        pos_detail = parts[1] if len(parts) > 1 else ""

        if pos not in _KEYWORD_POS:
            continue

        if pos_detail in _EXCLUDE_POS_DETAIL:
            continue

        # 動詞・形容詞は原形（基本形）を使う
        base_form = token.base_form if token.base_form != "*" else token.surface

        # 記号のみのトークンを除外
        if _SYMBOL_ONLY.match(base_form):
            continue

        # 1文字の非 ASCII（平仮名・カタカナ）は除外
        if len(base_form) == 1 and not base_form.isascii():
            continue

        if base_form in _STOP_WORDS:
            continue

        # 英語ストップワード（小文字比較）
        if base_form.lower() in _ENGLISH_STOP_WORDS:
            continue

        counter[base_form] += 1

        if base_form not in token_info:
            reading = token.reading if token.reading != "*" else ""
            token_info[base_form] = {
                "word": base_form,
                "reading": reading,
                "pos": pos,
            }

    results = []
    for word, count in counter.most_common(max_keywords):
        entry = token_info[word].copy()
        entry["count"] = count
        results.append(entry)

    return results


def extract_keywords_text(text: str, max_keywords: int = 30) -> str:
    """キーワードをスペース区切りのテキストとして返す。"""
    keywords = extract_keywords(text, max_keywords)
    return " ".join(kw["word"] for kw in keywords)

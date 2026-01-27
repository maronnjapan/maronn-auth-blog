"""Markdown 構文を除去してプレーンテキストを取得する。"""

import re


def strip_frontmatter(markdown: str) -> str:
    """YAML フロントマターを除去する。"""
    pattern = r"^---\s*\n.*?\n---\s*\n"
    return re.sub(pattern, "", markdown, count=1, flags=re.DOTALL)


def strip_markdown(markdown: str) -> str:
    """Markdown 構文を除去してプレーンテキストを返す。"""
    text = markdown

    # コードブロック除去
    text = re.sub(r"```[\s\S]*?```", "", text)

    # インラインコード除去
    text = re.sub(r"`[^`]+`", "", text)

    # 画像除去
    text = re.sub(r"!\[.*?\]\(.*?\)", "", text)

    # リンクをテキストのみに変換
    text = re.sub(r"\[([^\]]+)\]\(.*?\)", r"\1", text)

    # 見出しマーカー除去
    text = re.sub(r"^#{1,6}\s+", "", text, flags=re.MULTILINE)

    # 太字・斜体マーカー除去
    text = re.sub(r"(\*{1,3}|_{1,3})(.*?)\1", r"\2", text)

    # 取り消し線除去
    text = re.sub(r"~~(.*?)~~", r"\1", text)

    # 引用マーカー除去
    text = re.sub(r"^>\s?", "", text, flags=re.MULTILINE)

    # 水平線除去
    text = re.sub(r"^[-*_]{3,}$", "", text, flags=re.MULTILINE)

    # リストマーカー除去
    text = re.sub(r"^[\s]*[-*+]\s+", "", text, flags=re.MULTILINE)
    text = re.sub(r"^[\s]*\d+\.\s+", "", text, flags=re.MULTILINE)

    # HTML タグ除去
    text = re.sub(r"<[^>]+>", "", text)

    # 連続改行を圧縮
    text = re.sub(r"\n{2,}", "\n", text)

    return text.strip()

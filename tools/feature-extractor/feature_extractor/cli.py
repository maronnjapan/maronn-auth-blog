"""CLI エントリーポイント。

使い方:
    # ファイルから読み込み
    python -m feature_extractor.cli article.md

    # 標準入力から読み込み
    cat article.md | python -m feature_extractor.cli

    # JSON 出力（デフォルト）
    python -m feature_extractor.cli article.md

    # テキスト出力（キーワードのみスペース区切り）
    python -m feature_extractor.cli article.md --format text

    # キーワード数を指定
    python -m feature_extractor.cli article.md --max-keywords 50
"""

import argparse
import json
import sys

from .analyzer import extract_keywords, extract_keywords_text
from .markdown_stripper import strip_frontmatter, strip_markdown


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Markdown 記事から形態素解析でキーワードを抽出する"
    )
    parser.add_argument(
        "file",
        nargs="?",
        help="入力 Markdown ファイル（省略時は標準入力）",
    )
    parser.add_argument(
        "--max-keywords",
        type=int,
        default=30,
        help="抽出するキーワードの最大数（デフォルト: 30）",
    )
    parser.add_argument(
        "--format",
        choices=["json", "text"],
        default="json",
        help="出力形式（デフォルト: json）",
    )

    args = parser.parse_args()

    if args.file:
        with open(args.file, encoding="utf-8") as f:
            markdown = f.read()
    else:
        markdown = sys.stdin.read()

    # Markdown → プレーンテキスト
    content = strip_frontmatter(markdown)
    plain_text = strip_markdown(content)

    if args.format == "text":
        print(extract_keywords_text(plain_text, args.max_keywords))
    else:
        keywords = extract_keywords(plain_text, args.max_keywords)
        output = {
            "keywords": keywords,
            "keywords_text": " ".join(kw["word"] for kw in keywords),
        }
        print(json.dumps(output, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()

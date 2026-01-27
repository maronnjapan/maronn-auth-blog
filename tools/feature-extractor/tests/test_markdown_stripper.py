from feature_extractor.markdown_stripper import strip_frontmatter, strip_markdown


class TestStripFrontmatter:
    def test_removes_frontmatter(self):
        md = "---\ntitle: Test\npublished: true\n---\n\n# Content"
        result = strip_frontmatter(md)
        assert "title:" not in result
        assert "# Content" in result

    def test_no_frontmatter(self):
        md = "# Just content"
        result = strip_frontmatter(md)
        assert result == md


class TestStripMarkdown:
    def test_removes_code_blocks(self):
        md = "テキスト\n```python\nprint('hello')\n```\n続き"
        result = strip_markdown(md)
        assert "print" not in result
        assert "テキスト" in result
        assert "続き" in result

    def test_removes_inline_code(self):
        md = "`console.log` を使う"
        result = strip_markdown(md)
        assert "`" not in result
        assert "を使う" in result

    def test_converts_links_to_text(self):
        md = "[公式ドキュメント](https://example.com)を参照"
        result = strip_markdown(md)
        assert "公式ドキュメント" in result
        assert "https://example.com" not in result

    def test_removes_images(self):
        md = "前 ![スクショ](./images/test.png) 後"
        result = strip_markdown(md)
        assert "test.png" not in result
        assert "前" in result
        assert "後" in result

    def test_removes_heading_markers(self):
        md = "## 認証フロー"
        result = strip_markdown(md)
        assert "認証フロー" in result
        assert result.startswith("認証")

    def test_removes_bold_italic(self):
        md = "これは**太字**と*斜体*です"
        result = strip_markdown(md)
        assert "太字" in result
        assert "斜体" in result
        assert "**" not in result
        assert "*" not in result

    def test_removes_list_markers(self):
        md = "- 項目1\n- 項目2\n1. 番号付き"
        result = strip_markdown(md)
        assert "項目1" in result
        assert "番号付き" in result

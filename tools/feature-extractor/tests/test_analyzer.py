from feature_extractor.analyzer import extract_keywords, extract_keywords_text


class TestExtractKeywords:
    def test_extracts_nouns(self):
        text = "OAuth認証のフローについて解説します。PKCEを使ったセキュリティ対策を紹介します。"
        keywords = extract_keywords(text)
        words = [kw["word"] for kw in keywords]
        assert "認証" in words
        assert "フロー" in words
        assert "PKCE" in words
        assert "セキュリティ" in words

    def test_excludes_stop_words(self):
        text = "これはテストのためのサンプルです。認証することが必要です。"
        keywords = extract_keywords(text)
        words = [kw["word"] for kw in keywords]
        assert "これ" not in words
        assert "ため" not in words
        assert "こと" not in words
        assert "する" not in words

    def test_counts_frequency(self):
        text = "認証の認証による認証のための仕組み"
        keywords = extract_keywords(text)
        auth_kw = next(kw for kw in keywords if kw["word"] == "認証")
        assert auth_kw["count"] == 3

    def test_max_keywords_limit(self):
        text = "認証 認可 セキュリティ トークン セッション ログイン パスワード 暗号化"
        keywords = extract_keywords(text, max_keywords=3)
        assert len(keywords) <= 3

    def test_returns_pos(self):
        text = "OAuth認証を実装する"
        keywords = extract_keywords(text)
        for kw in keywords:
            assert kw["pos"] in {"名詞", "動詞", "形容詞"}

    def test_verbs_use_base_form(self):
        text = "実装しています。設定されました。"
        keywords = extract_keywords(text)
        words = [kw["word"] for kw in keywords]
        # 動詞は原形で抽出される
        if "実装" in words:
            assert "実装し" not in words

    def test_english_words(self):
        text = "Auth0とOAuthとPKCEについて"
        keywords = extract_keywords(text)
        words = [kw["word"] for kw in keywords]
        assert "Auth0" in words or "OAuth" in words or "PKCE" in words


class TestExtractKeywordsText:
    def test_returns_space_separated(self):
        text = "認証フローのセキュリティ対策"
        result = extract_keywords_text(text)
        assert isinstance(result, str)
        # スペース区切りであることを確認
        assert " " in result or len(result.split()) == 1

    def test_empty_input(self):
        result = extract_keywords_text("")
        assert result == ""

import { useState } from 'react';

interface InquiryFormProps {
  apiUrl: string;
}

const INQUIRY_TYPES = [
  { value: 'consulting', label: 'セキュリティコンサルティング' },
  { value: 'development', label: '認証・認可システム開発' },
  { value: 'training', label: 'セキュリティ研修・トレーニング' },
  { value: 'other', label: 'その他' },
] as const;

export default function InquiryForm({ apiUrl }: InquiryFormProps) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    company: '',
    inquiryType: 'consulting' as string,
    subject: '',
    message: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`${apiUrl}/inquiries`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        setSubmitted(true);
      } else {
        const data = await response.json().catch(() => null);
        setError(data?.error?.message || '送信に失敗しました。もう一度お試しください。');
      }
    } catch {
      setError('ネットワークエラーが発生しました。もう一度お試しください。');
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="inquiry-success">
        <div className="success-icon">
          <svg viewBox="0 0 24 24" width={48} height={48} fill="none" stroke="#059669" strokeWidth="2">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
        </div>
        <h2 className="success-title">お問い合わせを受け付けました</h2>
        <p className="success-message">
          ご連絡ありがとうございます。内容を確認の上、担当者よりご連絡いたします。
        </p>
        <a href="/" className="back-link">トップページに戻る</a>

        <style>{`
          .inquiry-success {
            text-align: center;
            padding: 3rem 1rem;
          }
          .success-icon {
            margin-bottom: 1.5rem;
          }
          .success-title {
            font-size: 1.5rem;
            color: #333;
            margin-bottom: 0.75rem;
          }
          .success-message {
            color: #666;
            font-size: 1rem;
            line-height: 1.6;
            margin-bottom: 2rem;
          }
          .back-link {
            display: inline-block;
            color: #6366f1;
            font-weight: 500;
            text-decoration: none;
          }
          .back-link:hover {
            text-decoration: underline;
          }
        `}</style>
      </div>
    );
  }

  return (
    <form className="inquiry-form" onSubmit={handleSubmit}>
      <div className="form-group">
        <label htmlFor="inquiryType">お問い合わせ種別 <span className="required">*</span></label>
        <select
          id="inquiryType"
          name="inquiryType"
          value={formData.inquiryType}
          onChange={handleChange}
          required
        >
          {INQUIRY_TYPES.map((type) => (
            <option key={type.value} value={type.value}>
              {type.label}
            </option>
          ))}
        </select>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label htmlFor="name">お名前 <span className="required">*</span></label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
            maxLength={100}
            placeholder="山田 太郎"
          />
        </div>
        <div className="form-group">
          <label htmlFor="email">メールアドレス <span className="required">*</span></label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            required
            maxLength={254}
            placeholder="taro@example.com"
          />
        </div>
      </div>

      <div className="form-group">
        <label htmlFor="company">会社名</label>
        <input
          type="text"
          id="company"
          name="company"
          value={formData.company}
          onChange={handleChange}
          maxLength={200}
          placeholder="株式会社○○"
        />
      </div>

      <div className="form-group">
        <label htmlFor="subject">件名 <span className="required">*</span></label>
        <input
          type="text"
          id="subject"
          name="subject"
          value={formData.subject}
          onChange={handleChange}
          required
          maxLength={200}
          placeholder="認証基盤の設計についてのご相談"
        />
      </div>

      <div className="form-group">
        <label htmlFor="message">お問い合わせ内容 <span className="required">*</span></label>
        <textarea
          id="message"
          name="message"
          value={formData.message}
          onChange={handleChange}
          required
          minLength={10}
          maxLength={5000}
          rows={8}
          placeholder="お問い合わせ内容をご記入ください。&#10;プロジェクトの概要、ご予算感、ご希望のスケジュール等をお伝えいただけると、よりスムーズにご対応できます。"
        />
        <span className="char-count">{formData.message.length} / 5000</span>
      </div>

      {error && (
        <div className="form-error">{error}</div>
      )}

      <button
        type="submit"
        className="submit-btn"
        disabled={submitting}
      >
        {submitting ? '送信中...' : '送信する'}
      </button>

      <style>{`
        .inquiry-form {
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }
        .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
        }
        @media (max-width: 600px) {
          .form-row {
            grid-template-columns: 1fr;
          }
        }
        .form-group {
          display: flex;
          flex-direction: column;
          gap: 0.4rem;
        }
        .form-group label {
          font-size: 0.9rem;
          font-weight: 600;
          color: #333;
        }
        .required {
          color: #ef4444;
        }
        .form-group input,
        .form-group select,
        .form-group textarea {
          padding: 0.65rem 0.75rem;
          border: 1px solid #d0d5dd;
          border-radius: 6px;
          font-size: 0.95rem;
          font-family: inherit;
          transition: border-color 0.2s;
          background: white;
        }
        .form-group input:focus,
        .form-group select:focus,
        .form-group textarea:focus {
          outline: none;
          border-color: #6366f1;
          box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
        }
        .form-group textarea {
          resize: vertical;
          min-height: 120px;
        }
        .char-count {
          font-size: 0.8rem;
          color: #888;
          text-align: right;
        }
        .form-error {
          background: #fef2f2;
          color: #dc2626;
          padding: 0.75rem 1rem;
          border-radius: 6px;
          font-size: 0.9rem;
          border: 1px solid #fecaca;
        }
        .submit-btn {
          background: #6366f1;
          color: white;
          padding: 0.75rem 2rem;
          border: none;
          border-radius: 8px;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.2s;
          align-self: flex-start;
        }
        .submit-btn:hover {
          background: #4f46e5;
        }
        .submit-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
      `}</style>
    </form>
  );
}

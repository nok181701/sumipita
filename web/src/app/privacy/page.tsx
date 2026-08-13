import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "プライバシーポリシー",
};

const ENACTED_DATE = "2026年8月13日";

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-card border border-line bg-white p-5 shadow-card">
      <h2 className="text-base font-bold tracking-tight text-ink">{title}</h2>
      <div className="mt-2 space-y-2 text-[13px] leading-relaxed text-ink">
        {children}
      </div>
    </section>
  );
}

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 pb-10 pt-6">
      <Link
        href="/"
        className="text-[13px] text-aqua-700 underline decoration-aqua-200 underline-offset-2 hover:text-aqua-600"
      >
        ← 地図に戻る
      </Link>

      <h1 className="mt-4 text-xl font-bold tracking-tight text-ink">
        プライバシーポリシー
      </h1>
      <p className="mt-1.5 text-[12px] text-muted">制定日:{ENACTED_DATE}</p>

      <p className="mt-4 text-[13px] leading-relaxed text-ink">
        すみピタ運営事務局(以下「当方」)は、本サービス「すみピタ」(
        <span className="whitespace-nowrap">https://sumipita.com/</span>
        、以下「本サービス」)における利用者の個人情報の取り扱いについて、以下のとおりプライバシーポリシー(以下「本ポリシー」)を定めます。
      </p>

      <div className="mt-4 space-y-3">
        <Section title="1. 取得する情報">
          <p>
            本サービスへのログインには、Googleアカウントによる認証(Googleログイン)を利用しており、Google社から以下の情報を取得します。
          </p>
          <ul className="list-disc space-y-1 pl-5">
            <li>メールアドレス</li>
            <li>氏名(Googleアカウントに登録された表示名)</li>
            <li>プロフィール画像</li>
          </ul>
          <p>
            また、ログイン後にお気に入り登録機能をご利用いただいた場合、登録された町丁目の情報がお客様のアカウントに紐づけて保存されます。
          </p>
          <p>
            このほか、本サービスはCloudflare上で稼働しており、アクセス時のIPアドレスやブラウザ情報等が、インフラ提供事業者(Cloudflare,
            Inc.)によりアクセスログとして自動的に記録されます。
          </p>
        </Section>

        <Section title="2. 利用目的">
          <p>取得した情報は、以下の目的の範囲内で利用します。</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>ログイン認証・本人確認</li>
            <li>お気に入り機能など、アカウントに紐づく機能の提供</li>
            <li>不正利用の防止、本サービスの維持・保守</li>
            <li>
              サービス改善のための分析(実施する場合は本ポリシーを改定のうえお知らせします)
            </li>
          </ul>
        </Section>

        <Section title="3. 第三者提供・委託">
          <p>
            当方は、法令に基づく場合を除き、取得した個人情報をご本人の同意なく第三者に提供しません。ただし、以下の外部サービスに情報の取り扱いを委託しています。
          </p>
          <ul className="list-disc space-y-1 pl-5">
            <li>Google LLC(Googleログインによる認証)</li>
            <li>Cloudflare, Inc.(サーバー・データベース等インフラの提供)</li>
          </ul>
          <p>
            これら委託先における情報の取り扱いは、各社が定めるプライバシーポリシーに準じます。
          </p>
        </Section>

        <Section title="4. Cookieについて">
          <p>
            本サービスは、ログイン状態を維持するために必要なCookieを使用します。現時点で、アクセス解析や広告配信を目的としたCookieは使用していません。今後導入する場合は、本ポリシーを改定のうえお知らせします。
          </p>
        </Section>

        <Section title="5. 保管期間・削除">
          <p>
            取得した情報は、アカウントが存在する期間、本サービスの提供に必要な範囲で保管します。アカウントの削除やデータの消去をご希望の場合は、下記のお問い合わせ窓口までご連絡ください。ご本人確認のうえ、合理的な期間内に対応します。
          </p>
          <p>
            現時点ではアカウントを即時に自動削除する機能は提供しておらず、削除は運営による手動対応となります。
          </p>
        </Section>

        <Section title="6. 開示・訂正・利用停止等の請求">
          <p>
            ご本人から、保有する個人情報の開示・訂正・削除・利用停止等を求められた場合、法令に従い、ご本人確認のうえ対応します。
          </p>
        </Section>

        <Section title="7. お問い合わせ窓口">
          <p>
            本ポリシーおよび個人情報の取り扱いに関するお問い合わせ窓口は、現在準備中です。ご用意でき次第、本ページに掲載します。
          </p>
        </Section>

        <Section title="8. 本ポリシーの変更">
          <p>
            本ポリシーの内容は、法令の変更やサービス内容の変更等に応じて、予告なく改定することがあります。重要な変更を行う場合は、本サービス内でお知らせします。
          </p>
        </Section>

        <Section title="9. 準拠法">
          <p>本ポリシーの解釈にあたっては、日本法を準拠法とします。</p>
        </Section>
      </div>
    </div>
  );
}

import Link from "next/link";
import type { Metadata } from "next";
import LegalSection from "@/components/LegalSection";

export const metadata: Metadata = {
  title: "特定商取引法に基づく表記",
};

export default function TokushohoPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 pb-10 pt-6">
      <Link
        href="/"
        className="text-[13px] text-aqua-700 underline decoration-aqua-200 underline-offset-2 hover:text-aqua-600"
      >
        ← 地図に戻る
      </Link>

      <h1 className="mt-4 text-xl font-bold tracking-tight text-ink">
        特定商取引法に基づく表記
      </h1>

      <p className="mt-4 text-[13px] leading-relaxed text-ink">
        特定商取引法第11条に基づき、以下のとおり表示します。
      </p>

      <div className="mt-4 space-y-3">
        <LegalSection title="販売業者・運営統括責任者・所在地・電話番号">
          <p>
            ご請求をいただいた場合には、遅滞なく開示いたします。開示のご請求は下記メールアドレス宛にご連絡ください。
          </p>
        </LegalSection>

        <LegalSection title="連絡先メールアドレス">
          <p>sumipita11@gmail.com</p>
        </LegalSection>

        <LegalSection title="販売価格">
          <p>
            プレミアムプランの料金は、
            <Link
              href="/account"
              className="text-aqua-700 underline decoration-aqua-200 underline-offset-2 hover:text-aqua-600"
            >
              アカウントページ
            </Link>
            の登録画面（Stripeの決済画面）に表示される金額のとおりです（すべて税込)。
          </p>
        </LegalSection>

        <LegalSection title="商品代金以外の必要料金">
          <p>なし。インターネット接続に関する通信料は利用者のご負担となります。</p>
        </LegalSection>

        <LegalSection title="お支払い方法">
          <p>クレジットカード決済(Stripe社の決済システムを利用)。</p>
        </LegalSection>

        <LegalSection title="お支払い時期">
          <p>
            プレミアムプランへの登録手続き完了時に初回の決済が行われ、以降は同一の周期で自動的に継続課金されます。
          </p>
        </LegalSection>

        <LegalSection title="サービス提供時期">
          <p>決済完了後、直ちにプレミアムプランの機能をご利用いただけます。</p>
        </LegalSection>

        <LegalSection title="解約・キャンセルについて">
          <p>
            プレミアムプランは、
            <Link
              href="/account"
              className="text-aqua-700 underline decoration-aqua-200 underline-offset-2 hover:text-aqua-600"
            >
              アカウントページ
            </Link>
            の「支払い管理」からいつでも解約できます。解約した場合、既にお支払いいただいた期間の途中であっても、日割りによる返金は行いません。解約後は、その時点で契約中の期間の終了をもってプレミアムプランの機能が利用できなくなります。
          </p>
        </LegalSection>
      </div>
    </div>
  );
}

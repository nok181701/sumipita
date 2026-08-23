import Link from "next/link";
import type { Metadata } from "next";
import LegalSection from "@/components/LegalSection";

export const metadata: Metadata = {
  title: "利用規約",
};

const ENACTED_DATE = "2026年8月14日";

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 pb-10 pt-6">
      <Link
        href="/"
        className="text-[13px] text-aqua-700 underline decoration-aqua-200 underline-offset-2 hover:text-aqua-600"
      >
        ← 地図に戻る
      </Link>

      <h1 className="mt-4 text-xl font-bold tracking-tight text-ink">
        利用規約
      </h1>
      <p className="mt-1.5 text-[12px] text-muted">制定日:{ENACTED_DATE}</p>

      <p className="mt-4 text-[13px] leading-relaxed text-ink">
        この利用規約(以下「本規約」)は、すみピタ運営事務局(以下「当方」)が提供する「すみピタ」(
        <span className="whitespace-nowrap">https://sumipita.com/</span>
        、以下「本サービス」)の利用条件を定めるものです。利用者の皆様(以下「利用者」)には、本規約に同意のうえ本サービスをご利用いただきます。
      </p>

      <div className="mt-4 space-y-3">
        <LegalSection title="第1条(適用)">
          <p>
            本規約は、利用者と当方との間の本サービスの利用に関わる一切の関係に適用されます。本サービスを利用した時点で、利用者は本規約に同意したものとみなします。
          </p>
        </LegalSection>

        <LegalSection title="第2条(サービス内容)">
          <p>
            本サービスは、東京23区の町丁目ごとに、治安・洪水・地盤(液状化)・高潮を公的データに基づき当方独自の基準で採点し、地図上に表示するものです。地図の閲覧は登録不要でご利用いただけます。Googleアカウントでログインすると、お気に入り登録など一部機能を追加でご利用いただけます。
          </p>
        </LegalSection>

        <LegalSection title="第3条(利用登録)">
          <p>
            本サービスの一部機能の利用にあたっては、Googleアカウントによるログインが必要です。ログインにより取得する情報の取り扱いは、
            <Link
              href="/privacy"
              className="text-aqua-700 underline decoration-aqua-200 underline-offset-2 hover:text-aqua-600"
            >
              プライバシーポリシー
            </Link>
            に定めるとおりです。
          </p>
          <p>
            当方は、登録希望者が過去に本規約違反により利用制限を受けたことがある場合など、当方が不適切と判断した場合には、登録をお断りすることがあります。
          </p>
        </LegalSection>

        <LegalSection title="第4条(禁止事項)">
          <p>利用者は、本サービスの利用にあたり、以下の行為をしてはなりません。</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>法令又は公序良俗に違反する行為</li>
            <li>犯罪行為に関連する行為</li>
            <li>
              本サービスのサーバーやネットワークに過度な負荷をかける行為(通常の閲覧の範囲を超えた自動的・網羅的な収集(スクレイピング)等を含む)
            </li>
            <li>本サービスの運営を妨害するおそれのある行為</li>
            <li>不正アクセスをし、又はこれを試みる行為</li>
            <li>他の利用者に関する個人情報等を収集又は蓄積する行為</li>
            <li>他の利用者になりすます行為</li>
            <li>
              本サービスが提供するスコア・データを、当方の許諾なく本サービス外で複製・転載・再配布し、又は商業目的で利用する行為
            </li>
            <li>
              不正の目的をもって、一人の利用者が複数のアカウントを作成する行為
            </li>
            <li>その他、当方が不適切と判断する行為</li>
          </ul>
        </LegalSection>

        <LegalSection title="第5条(本サービスの提供の停止・変更・終了)">
          <p>
            当方は、以下のいずれかの事由があると判断した場合、利用者への事前の通知なく、本サービスの全部又は一部の提供を停止又は中断することがあります。
          </p>
          <ul className="list-disc space-y-1 pl-5">
            <li>本サービスにかかるシステムの保守点検又は更新を行う場合</li>
            <li>
              地震、落雷、火災、停電、天災などの不可抗力により本サービスの提供が困難となった場合
            </li>
            <li>その他、当方が本サービスの提供が困難と判断した場合</li>
          </ul>
          <p>
            当方は、当方の判断により、本サービスの内容を変更し、又は本サービスの提供を終了することができるものとします。当方は、本サービスの提供の停止・変更・終了により利用者に生じた損害について、当方に故意又は重大な過失がある場合を除き、責任を負いません。
          </p>
        </LegalSection>

        <LegalSection title="第6条(免責事項)">
          <p>
            本サービスが表示するスコアは、公的機関が公開するデータをもとに当方が独自に算出した参考情報であり、対象となる町丁目の安全性や住み心地等を保証するものではありません。データの正確性、最新性、完全性についても保証するものではなく、実際の意思決定(引っ越し先の決定等)にあたっては、必ず現地確認や関係する公的機関への確認を行ってください。
          </p>
          <p>
            当方は、本サービスに事実上又は法律上の瑕疵(安全性、信頼性、正確性、完全性、有効性、特定の目的への適合性、セキュリティなどに関する欠陥、エラーやバグ、権利侵害などを含みます)がないことを保証するものではありません。
          </p>
          <p>
            当方は、本サービスに起因して利用者に生じたあらゆる損害について、当方の故意又は重大な過失による場合を除き、一切の責任を負いません。
          </p>
        </LegalSection>

        <LegalSection title="第7条(知的財産権)">
          <p>
            本サービスに関する著作権、商標権その他の知的財産権は、当方又は正当な権利を有する第三者に帰属します。本サービスが引用する公的データの出典・ライセンスは、本サービストップページの表示のとおりです。
          </p>
        </LegalSection>

        <LegalSection title="第8条(利用制限及び登録抹消)">
          <p>
            当方は、利用者が本規約のいずれかの条項に違反した場合など、当方が必要と判断した場合には、事前の通知なく、当該利用者に対して本サービスの全部又は一部の利用を制限し、又は登録を抹消することができるものとします。
          </p>
        </LegalSection>

        <LegalSection title="第9条(退会)">
          <p>
            利用者は、画面右上のアカウントアイコンから、いつでも本サービスから退会し、アカウントに関するデータを削除することができます。
          </p>
        </LegalSection>

        <LegalSection title="第10条(本規約の変更)">
          <p>
            当方は、必要と判断した場合には、利用者に通知することなく本規約を変更できるものとします。変更後の本規約は、本サービス上に表示した時点から効力を生じるものとします。
          </p>
        </LegalSection>

        <LegalSection title="第11条(準拠法・裁判管轄)">
          <p>
            本規約の解釈にあたっては、日本法を準拠法とします。本サービスに関して紛争が生じた場合には、東京地方裁判所を第一審の専属的合意管轄裁判所とします。
          </p>
        </LegalSection>
      </div>
    </div>
  );
}

"""OGP画像（1200x630）を生成する

SNSやチャットにURLを貼ったときに出るカード画像。
Next.js の ImageResponse でも作れるが、日本語フォントをビルド時に用意する必要があり
環境依存で壊れやすいので、静的PNGを1枚焼いて public/og.png に置く方式にした。
文言を変えたらこのスクリプトを実行し直すこと。
"""
import os

from PIL import Image, ImageDraw, ImageFont

W, H = 1200, 630
OUT = "web/public/og.png"

BG_TOP = (242, 251, 253)
BG_BOTTOM = (255, 255, 255)
INK = (15, 44, 56)
AQUA = (26, 148, 172)
MUTED = (91, 124, 136)

# チップの色はスコアの赤〜緑と意味が衝突しないよう寒色でそろえる。
# ここで地盤を赤にすると「地盤が危ない」という意味に読めてしまう。
AXIS = [
    ("治安", (26, 148, 172)),
    ("洪水・内水", (43, 179, 205)),
    ("高潮", (63, 142, 186)),
    ("地盤", (32, 163, 146)),
]

FONT_CANDIDATES = [
    "/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc",
    "/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc",
    "/System/Library/Fonts/ヒラギノ角ゴシック W6.ttc",
    "/System/Library/Fonts/Hiragino Sans GB.ttc",
]


def font(size, index=0):
    for p in FONT_CANDIDATES:
        if os.path.exists(p):
            try:
                return ImageFont.truetype(p, size, index=index)
            except OSError:
                continue
    raise FileNotFoundError(
        "日本語フォントが見つかりません。FONT_CANDIDATES にパスを足してください。"
    )


def main():
    img = Image.new("RGB", (W, H), BG_BOTTOM)
    d = ImageDraw.Draw(img)

    # 上から下へ淡いグラデーション。空と水のあいだの色
    for y in range(H):
        t = y / H
        d.line(
            [(0, y), (W, y)],
            fill=tuple(int(a + (b - a) * t) for a, b in zip(BG_TOP, BG_BOTTOM)),
        )

    d.rectangle([0, 0, W, 10], fill=AQUA)

    d.text((80, 96), "スムピタ", font=font(84), fill=AQUA)
    d.text((80, 212), "引越し先の街を、決める前に確かめる", font=font(46), fill=INK)

    d.text(
        (80, 300),
        "東京23区 3,142町丁目を、公的データで町ごとに採点",
        font=font(28),
        fill=MUTED,
    )

    # 4軸のチップ
    x = 80
    f = font(30)
    for label, color in AXIS:
        w = int(d.textlength(label, font=f))
        d.rounded_rectangle([x, 378, x + w + 56, 444], radius=33, fill=color)
        d.text((x + 28, 392), label, font=f, fill=(255, 255, 255))
        x += w + 56 + 16

    d.text(
        (80, 506),
        "治安と災害リスクは別物。合計点にせず、4つ並べて見せています。",
        font=font(26),
        fill=MUTED,
    )
    d.text(
        (80, 552),
        "出典: 警視庁 / 東京都建設局 / 東京都港湾局 / 東京都土木技術支援・人材育成センター / e-Stat",
        font=font(20),
        fill=MUTED,
    )

    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    img.save(OUT, optimize=True)
    print(f"{OUT}: {W}x{H} / {os.path.getsize(OUT) / 1024:.0f} KB")


if __name__ == "__main__":
    main()

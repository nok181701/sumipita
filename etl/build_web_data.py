"""dist/geojson を web/public/ に配置する

スコアや犯罪件数は D1 に入れて SSR するようになったので、
このスクリプトが扱うのは地図のポリゴンだけになった。
ポリゴンは6.4MBあり、SQLで扱う意味も無いので静的アセットのまま配る。
"""
import os
import shutil

SRC = "dist/geojson"
DST = "web/public/data/geojson"


def main():
    if not os.path.isdir(SRC):
        raise FileNotFoundError(
            f"{SRC} がありません。先に export_d1.py を実行してください。"
        )
    os.makedirs(os.path.dirname(DST), exist_ok=True)
    shutil.copytree(SRC, DST, dirs_exist_ok=True)
    files = os.listdir(DST)
    mb = sum(os.path.getsize(os.path.join(DST, f)) for f in files) / 1024 / 1024
    print(f"{DST}: {len(files)}ファイル / {mb:.1f} MB")


if __name__ == "__main__":
    main()

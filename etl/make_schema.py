"""dist/*.csv から D1 のスキーマとデータ投入用SQLを生成する

手で schema.sql を書いていた頃、ETLにカラムを足すたびに書き忘れて
実態とズレていた（liq_* / collapse_* / nat_* が丸ごと抜けていた）。
CSVから機械的に作れば、その事故が起きない。

    python3 etl/make_schema.py

出力:
    dist/schema.sql   テーブル定義
    dist/seed.sql     INSERT文（D1に流し込む）
"""
import csv
import os

DIST = "dist"
TABLES = ["towns", "town_scores", "crime_counts", "hazard_details"]

# 主キー。data_year があるテーブルは年度と複合にする。
# 来年のデータが出たら行を追加するだけで済み、過去比較も後から作れる。
PRIMARY_KEYS = {
    "towns": ["key"],
    "town_scores": ["key", "data_year"],
    "crime_counts": ["key", "data_year"],
    "hazard_details": ["key", "data_year"],
}

# 型を決めきれない列の明示。それ以外は値から推定する。
FORCE_TEXT = {"key", "ward", "town", "ward_code", "kokusei_code",
              "shared_polygon_key", "nat_rivers", "nat_main_label",
              "nat_max_label", "flood_source"}


def infer_type(name, values):
    if name in FORCE_TEXT:
        return "TEXT"
    seen_real = False
    for v in values:
        if v == "":
            continue
        try:
            int(v)
        except ValueError:
            try:
                float(v)
                seen_real = True
            except ValueError:
                return "TEXT"
    return "REAL" if seen_real else "INTEGER"


def read_table(name):
    with open(f"{DIST}/{name}.csv", encoding="utf-8") as f:
        rows = list(csv.DictReader(f))
    cols = list(rows[0].keys())
    types = {c: infer_type(c, [r[c] for r in rows]) for c in cols}
    return cols, types, rows


def sql_literal(v, t):
    if v == "":
        return "NULL"
    if t == "TEXT":
        return "'" + v.replace("'", "''") + "'"
    # pandas が bool を True/False で書き出すことがある
    if v in ("True", "False"):
        return "1" if v == "True" else "0"
    if t == "INTEGER":
        return str(int(float(v)))
    return v


def main():
    schema, seed = [], []
    schema.append("-- dist/*.csv から自動生成。手で編集しないこと。")
    schema.append("-- 作り直すには python3 etl/make_schema.py")
    schema.append("")

    for name in TABLES:
        cols, types, rows = read_table(name)
        pk = PRIMARY_KEYS[name]

        schema.append(f"DROP TABLE IF EXISTS {name};")
        defs = []
        for c in cols:
            null = "" if c in pk else ""
            defs.append(f"  {c} {types[c]}{null}")
        defs.append(f"  PRIMARY KEY ({', '.join(pk)})")
        schema.append(f"CREATE TABLE {name} (\n" + ",\n".join(defs) + "\n);")
        schema.append("")

        collist = ", ".join(cols)
        # D1 は1回のexecuteに送れるサイズに上限があるので小分けにする
        for i in range(0, len(rows), 200):
            chunk = rows[i:i + 200]
            values = ",\n".join(
                "(" + ", ".join(sql_literal(r[c], types[c]) for c in cols) + ")"
                for r in chunk
            )
            seed.append(f"INSERT INTO {name} ({collist}) VALUES\n{values};")

        print(f"{name}: {len(rows)}行 / {len(cols)}列")

    # 検索と絞り込みでよく使う列に索引を張る
    schema.append("CREATE INDEX idx_towns_ward ON towns(ward);")
    schema.append("CREATE INDEX idx_scores_year ON town_scores(data_year);")

    os.makedirs(DIST, exist_ok=True)
    with open(f"{DIST}/schema.sql", "w", encoding="utf-8") as f:
        f.write("\n".join(schema) + "\n")
    with open(f"{DIST}/seed.sql", "w", encoding="utf-8") as f:
        f.write("\n".join(seed) + "\n")

    for n in ["schema.sql", "seed.sql"]:
        print(f"{DIST}/{n}: {os.path.getsize(f'{DIST}/{n}') / 1024:.0f} KB")


if __name__ == "__main__":
    main()

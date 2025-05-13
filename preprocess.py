import wfdb
import numpy as np
import pandas as pd
import os

# ─── Configuration ────────────────────────────────────────────────────────────
RECORDS = ['100','101','102','103','104',
           '105','106','107','108','109',
           '111','112','113','114','115']
DL_DIR  = 'mitdb'
OUT_CSV = 'rr_intervals.csv'
MIN_PCT = 0.001   # drop codes <0.1% of total

# ─── 1) Download the record + annotations ────────────────────────────────────
os.makedirs(DL_DIR, exist_ok=True)
wfdb.dl_database('mitdb', records=RECORDS, dl_dir=DL_DIR)

# ─── 2) Parse each record’s R-peak annotations & compute RR intervals ───────
df_list = []
for rec in RECORDS:
    rec_path   = os.path.join(DL_DIR, rec)
    record     = wfdb.rdrecord(rec_path)
    annotation = wfdb.rdann(rec_path, 'atr')

    fs        = record.fs
    times_s   = annotation.sample / fs
    rr_ms     = np.diff(times_s) * 1000.0
    beat_syms = annotation.symbol[1:]  # skip the first diff

    df = pd.DataFrame({
      'time_sec'   : times_s[1:],
      'rr_ms'      : rr_ms,
      'annotation' : beat_syms,
      'record_id'  : rec
    })
    df_list.append(df)

# ─── 3) Concatenate ───────────────────────────────────────────────────────────
all_rr = pd.concat(df_list, ignore_index=True)

# ─── 4) Filter out rare annotation codes ─────────────────────────────────────
counts = all_rr['annotation'].value_counts(normalize=True)
keep   = counts[counts >= MIN_PCT].index.tolist()
filtered = all_rr[ all_rr['annotation'].isin(keep) ]

print(f"Kept {len(keep)} codes (≥{MIN_PCT*100:.1f}% frequency): {keep}")
print(f"Rows before: {len(all_rr)}, after filter: {len(filtered)}")

# ─── 5) Save to CSV ───────────────────────────────────────────────────────────
filtered.to_csv(OUT_CSV, index=False)
print(f"✅ Saved {OUT_CSV} with {len(filtered)} rows")
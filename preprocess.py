import wfdb
import numpy as np
import pandas as pd
import os

# ─── Configuration ────────────────────────────────────────────────────────────
# Original 100–104, plus ten more valid records: 105–109, 111–115
RECORDS = ['100','101','102','103','104',
           '105','106','107','108','109',
           '111','112','113','114','115']
DL_DIR  = 'mitdb'

# ─── 1) Download the record + annotations ────────────────────────────────────
os.makedirs(DL_DIR, exist_ok=True)
wfdb.dl_database('mitdb', records=RECORDS, dl_dir=DL_DIR)

# ─── 2) Parse each record’s R-peak annotations & compute RR intervals ───────
df_list = []
for rec in RECORDS:
    rec_path   = os.path.join(DL_DIR, rec)
    record     = wfdb.rdrecord(rec_path)
    annotation = wfdb.rdann(rec_path, 'atr')

    fs       = record.fs
    times_s  = annotation.sample / fs
    rr_ms    = np.diff(times_s) * 1000.0
    beat_syms = annotation.symbol[1:]

    df = pd.DataFrame({
      'time_sec'   : times_s[1:],
      'rr_ms'      : rr_ms,
      'annotation' : beat_syms,
      'record_id'  : rec
    })
    df_list.append(df)

# ─── 3) Concatenate & inspect ─────────────────────────────────────────────────
all_rr = pd.concat(df_list, ignore_index=True)

print("Pulled records:", sorted(all_rr['record_id'].unique()))
print("Unique beat types:", np.unique(all_rr['annotation']))

# ─── 4) Save to CSV ────────────────────────────────────────────────────────────
all_rr.to_csv('rr_intervals.csv', index=False)
print("✅ Saved rr_intervals.csv with", len(all_rr), "rows")

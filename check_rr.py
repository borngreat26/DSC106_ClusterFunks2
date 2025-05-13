# check_rr.py
import pandas as pd

df = pd.read_csv('rr_intervals.csv')
vc = df['annotation'].value_counts(normalize=True).sort_index()
print(vc)
print(f"Unique codes after filter: {list(vc.index)}")
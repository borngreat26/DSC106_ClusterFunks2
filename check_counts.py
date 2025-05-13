# check_counts.py
import csv
from collections import Counter

counts = Counter()
with open('rr_intervals.csv', newline='') as f:
    reader = csv.DictReader(f)
    for row in reader:
        counts[row['annotation']] += 1

total = sum(counts.values())
print(f"Total beats: {total}\n")
for code, cnt in counts.most_common():
    pct = cnt / total * 100
    print(f"{code!r}: {cnt} ({pct:.2f}%)")
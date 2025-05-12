import pandas as pd
import matplotlib.pyplot as plt

# ─── 1) Load your RR‐interval data ─────────────────────────────────────────────
df = pd.read_csv('rr_intervals.csv')

# ─── 2) Figure 1: Overall RR‐interval distribution ────────────────────────────
plt.figure(figsize=(8,4))
plt.hist(df['rr_ms'], bins=50)
plt.title('Distribution of RR Intervals')
plt.xlabel('RR interval (ms)')
plt.ylabel('Count')
plt.tight_layout()
plt.savefig('hist_rr_intervals.png')
plt.close()

# ─── Figure 2: RR‐interval distribution by beat type (subplots) ────────────
symbols = ['N','A','V']
colors  = ['C0','C1','C2']

fig, axes = plt.subplots(3, 1, figsize=(8, 12))
for ax, symbol, color in zip(axes, symbols, colors):
    subset = df[df['annotation'] == symbol]
    ax.hist(subset['rr_ms'], bins=50, color=color, alpha=0.7)
    ax.set_title(f'RR Intervals for {symbol} Beats (n={len(subset)})')
    ax.set_xlabel('RR interval (ms)')
    ax.set_ylabel('Count')

fig.tight_layout()
fig.savefig('hist_rr_by_type_subplots.png')
plt.close()


# ─── 4) Figure 3: Time‐series of RR for each record ───────────────────────────
plt.figure(figsize=(12,4))
for rec in df['record_id'].unique():
    subset = df[df['record_id'] == rec]
    plt.plot(subset['time_sec'], subset['rr_ms'], label=f'Record {rec}')
plt.title('RR Interval Time‐Series')
plt.xlabel('Time (s)')
plt.ylabel('RR interval (ms)')
plt.legend()
plt.tight_layout()
plt.savefig('rr_timeseries.png')
plt.close()

print("✅ Generated hist_rr_intervals.png, hist_rr_by_type.png, rr_timeseries.png")
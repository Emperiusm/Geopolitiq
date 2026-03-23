export class BloomFilter {
  private bits: Uint8Array;
  private hashCount: number;

  constructor(expectedItems: number = 100_000, falsePositiveRate: number = 0.01) {
    const m = Math.ceil(-expectedItems * Math.log(falsePositiveRate) / (Math.log(2) ** 2));
    this.bits = new Uint8Array(Math.ceil(m / 8));
    this.hashCount = Math.ceil((m / expectedItems) * Math.log(2));
  }

  private hash(str: string, seed: number): number {
    let h = seed;
    for (let i = 0; i < str.length; i++) {
      h = ((h << 5) - h + str.charCodeAt(i)) | 0;
    }
    return Math.abs(h) % (this.bits.length * 8);
  }

  add(name: string): void {
    const normalized = name.toLowerCase().trim();
    for (let i = 0; i < this.hashCount; i++) {
      const bit = this.hash(normalized, i);
      this.bits[Math.floor(bit / 8)] |= 1 << (bit % 8);
    }
  }

  mightContain(name: string): boolean {
    const normalized = name.toLowerCase().trim();
    for (let i = 0; i < this.hashCount; i++) {
      const bit = this.hash(normalized, i);
      if (!(this.bits[Math.floor(bit / 8)] & (1 << (bit % 8)))) return false;
    }
    return true;
  }

  clear(): void {
    this.bits.fill(0);
  }
}

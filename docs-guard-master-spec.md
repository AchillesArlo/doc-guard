# Docs Guard — Master Spec & Execution Document

## Status Dokumen
- Versi: 1.0
- Status: Execution-ready specification
- Tipe: Product + engineering + delivery document
- Tujuan: Menjadi satu sumber kebenaran untuk membangun Docs Guard tanpa ambiguitas

## Ringkasan Eksekutif
Docs Guard adalah CLI dan GitHub Action untuk memastikan dokumentasi open source tetap benar, dapat diverifikasi, dan sinkron dengan codebase. Tool ini memindai file dokumentasi, mengekstrak snippet serta instruksi, memetakan referensi dokumen ke realitas codebase, lalu menjalankan serangkaian verifikasi seperti syntax validation, script validation, export validation, config validation, dan pada fase lanjut snippet execution.

Dokumen ini mendefinisikan tujuan produk, batasan, arsitektur, struktur file, fase implementasi, kontrak output, contoh penggunaan, strategi pengujian, standar kualitas, dan instruksi kerja yang cukup detail untuk dikerjakan oleh agent lain secara konsisten.

## Daftar Isi
1. Product Definition
2. Problem Statement
3. Success Criteria
4. Scope and Non-Goals
5. Personas and Use Cases
6. Functional Requirements
7. Non-Functional Requirements
8. System Architecture
9. Processing Pipeline
10. Rules Engine
11. Data Contracts
12. File and Folder Structure
13. Tech Stack
14. Example User Flows
15. CLI Specification
16. Config Specification
17. GitHub Action Specification
18. Reporting Specification
19. Implementation Plan
20. Testing Strategy
21. Security and Safety
22. Performance Strategy
23. Release Plan
24. Contribution Model
25. Agent Execution Brief
26. Acceptance Criteria
27. Appendix

---

## 1. Product Definition

### 1.1 Nama Produk
**Docs Guard**

### 1.2 Tagline
**CI guardrail untuk memastikan dokumentasi open source tetap benar, dapat diverifikasi, dan sinkron dengan codebase.**

### 1.3 Definisi Produk
Docs Guard adalah kombinasi **CLI**, **core rules engine**, dan **GitHub Action** yang memeriksa kualitas teknis dokumentasi. Fokus utama produk ini bukan grammar atau formatting markdown, melainkan **validitas operasional** dari isi dokumentasi. Sistem memindai file dokumentasi dan contoh implementasi, mengekstrak perintah serta referensi teknis, lalu memverifikasi apakah semuanya masih sesuai dengan keadaan codebase saat ini.

### 1.4 Problem Surface yang Ditangani
Dokumentasi dalam proyek open source sering mengalami *drift* setelah API, command, config, atau struktur package berubah. Dampaknya adalah onboarding gagal, issue berulang, hilangnya kepercayaan, dan bertambahnya beban maintainer. Docs Guard mengubah dokumentasi dari aset pasif menjadi artefak yang ikut diverifikasi dalam pipeline engineering.

### 1.5 Bentuk Produk
Produk dibagi menjadi empat lapisan utama:

- **Core engine** untuk discovery, parsing, resolution, verification, dan reporting.
- **CLI** untuk penggunaan lokal dan CI.
- **GitHub Action** untuk otomatisasi pada PR dan push.
- **Configuration system** untuk preset, ignore rules, severity threshold, dan mode eksekusi.

### 1.6 Sasaran Utama Produk

- Menangkap dokumentasi yang sudah tidak sesuai sebelum merge.
- Mengurangi issue dukungan akibat docs rusak atau outdated.
- Menyediakan laporan yang dapat langsung ditindaklanjuti maintainer.
- Menjadi tool yang mudah diadopsi oleh repo JavaScript/TypeScript pada fase awal.
- Membangun fondasi untuk ekspansi ke validasi multi-language dan execution sandbox.

### 1.7 Nilai Inti Produk

- **Actionable**: laporan harus menjawab apa yang rusak, di mana lokasinya, dan apa saran perbaikannya.
- **Low friction**: instalasi awal harus dapat selesai dalam beberapa menit.
- **Deterministic**: hasil check harus dapat direproduksi.
- **Composable**: checker baru dapat ditambahkan tanpa mengubah arsitektur inti.
- **Maintainer-first**: output dioptimalkan untuk pengambilan keputusan maintainer, bukan sekadar log mesin.

## 2. Problem Statement

### 2.1 Masalah Utama
Dalam proyek open source, dokumentasi adalah antarmuka produk. Banyak pengguna pertama kali berinteraksi dengan sebuah project lewat README, quick start, examples, migration guide, dan docs site. Ketika artefak ini tidak sinkron dengan source code, pengalaman pengguna rusak bahkan sebelum mereka benar-benar memakai software.

### 2.2 Gejala yang Umum Terjadi

- README masih menyebut API yang sudah dihapus atau diubah namanya.
- Command instalasi atau script project tidak lagi valid.
- Contoh kode tidak lagi sesuai dengan export package saat ini.
- Config key di dokumentasi sudah tidak cocok dengan schema aktual.
- Migration guide tidak lengkap atau salah setelah perubahan breaking.
- Folder `examples/` tertinggal beberapa versi dibanding package inti.

### 2.3 Dampak Bisnis dan Ekosistem

- Pengguna baru mengalami kegagalan onboarding.
- Maintainer menerima issue support yang sebenarnya bisa dicegah.
- Time-to-adoption meningkat.
- Reputasi kualitas repo menurun.
- Pull request berisiko merge walaupun docs sudah usang.

### 2.4 Mengapa Solusi yang Ada Belum Cukup
Markdown lint dan link checker hanya memeriksa struktur, style, dan validitas tautan. Unit test hanya memverifikasi perilaku source code, bukan akurasi instruksi di README. Karena itu, terdapat celah antara *code correctness* dan *documentation correctness*. Docs Guard dirancang khusus untuk menutup celah tersebut.

### 2.5 Pernyataan Masalah Formal
**Dokumentasi teknis di repositori open source tidak memiliki mekanisme validasi yang konsisten terhadap code reality, sehingga perubahan source code dapat diam-diam membuat dokumentasi salah tanpa terdeteksi dalam CI.**

## 3. Success Criteria

### 3.1 Tujuan Keberhasilan Produk
Sebuah implementasi Docs Guard dianggap berhasil jika mampu mendeteksi *docs drift* dengan tingkat false positive yang rendah, mudah diintegrasikan ke workflow maintainer, dan menghasilkan laporan yang dapat digunakan langsung untuk perbaikan.

### 3.2 Success Metrics Fase MVP

| Metric | Target MVP | Alasan |
|---|---:|---|
| Waktu setup awal | <= 10 menit | Menurunkan friction adopsi |
| Waktu scan repo kecil-menengah | <= 15 detik | Layak untuk CI |
| False positive rate pada smoke sample | < 10% | Menjaga kepercayaan maintainer |
| Repositori yang bisa di-scan tanpa crash | >= 90% pada test corpus | Stabilitas dasar |
| Cakupan check inti | 5 checker aktif | Fokus pada nilai tertinggi |

### 3.3 KPI Kualitatif

- Output mudah dibaca oleh maintainer non-expert.
- Konfigurasi awal sederhana tetapi tetap bisa dikustomisasi.
- Arsitektur cukup modular untuk checker tambahan.
- Dokumentasi internal proyek ini sendiri harus lolos Docs Guard.

### 3.4 Definisi Done MVP
MVP dianggap selesai jika seluruh poin berikut terpenuhi:

1. CLI `init`, `scan`, dan `check` berjalan stabil.
2. Mendukung scan `README.md`, `docs/**/*.md`, dan `examples/**/*`.
3. Mendukung validasi JavaScript/TypeScript docs surface berikut: export references, package scripts, command examples, dan config keys.
4. Menghasilkan laporan terminal serta JSON report.
5. GitHub Action dapat mem-fail pipeline berdasarkan severity threshold.
6. Tersedia minimal tiga fixture repo untuk integration testing.

## 4. Scope and Non-Goals

### 4.1 In-Scope MVP

- Target utama: repo **JavaScript/TypeScript**.
- File target: `README.md`, `docs/**/*.md`, `examples/**/*`, `CHANGELOG.md`, `MIGRATION.md`, `.env.example`, file config contoh.
- Checker inti:
  - Markdown code block extraction
  - Syntax validation untuk JS/TS/JSON/YAML dasar
  - Export reference validation
  - Package script validation
  - CLI command reference validation dasar
  - Config key validation
- Output:
  - human-readable CLI report
  - machine-readable JSON report
  - CI exit code berbasis severity

### 4.2 Out-of-Scope MVP

- Full semantic understanding dari narasi prose.
- Eksekusi snippet kompleks yang membutuhkan service eksternal.
- Auto-fix berbasis AI.
- Dukungan penuh untuk Python, Go, Rust, Java.
- PR review bot yang otomatis menulis patch.
- Dependency graph analysis lintas workspace yang sangat kompleks.

### 4.3 Fase Setelah MVP

- Snippet execution sandbox.
- Multi-language adapters.
- SARIF output.
- Pull request annotations yang lebih kaya.
- Migration drift intelligence.
- Example synchronization framework.
- Preset framework seperti Next.js, FastAPI, Express, CLIs.

### 4.4 Prinsip Scope Control
Setiap tambahan scope harus lolos pertanyaan ini:

1. Apakah ini mengurangi docs drift nyata?
2. Apakah ini sering terjadi pada maintainer OSS?
3. Apakah ini dapat diuji secara deterministik?
4. Apakah ini tidak menurunkan kualitas atau kecepatan MVP?

Jika salah satu jawabannya tidak, fitur tersebut ditunda.

## 5. Personas and Use Cases

### 5.1 Persona Utama

#### A. Solo Maintainer
Mengelola satu atau beberapa library kecil-menengah. Sering kewalahan menjaga sinkronisasi docs saat release cepat.

#### B. Core Team Maintainer
Bekerja dalam repo yang menerima banyak PR. Membutuhkan CI guard agar perubahan API tidak merusak docs secara diam-diam.

#### C. OSS Contributor
Ingin yakin perubahan yang dia buat tidak merusak quick start atau examples.

#### D. Developer Relations / Docs Owner
Bertanggung jawab atas kualitas onboarding dan ingin indikator objektif bahwa dokumentasi masih sehat.

### 5.2 Jobs-To-Be-Done

- “Saat saya mengubah API, saya ingin tahu bagian docs mana yang ikut rusak.”
- “Saat ada PR dari kontributor, saya ingin docs ikut tervalidasi tanpa review manual menyeluruh.”
- “Saat saya merilis versi baru, saya ingin quick start dan examples tetap jalan.”
- “Saat pengguna copy-paste dari README, saya ingin kemungkinan gagal seminimal mungkin.”

### 5.3 Use Case Primer

| Use Case | Deskripsi | Prioritas |
|---|---|---|
| Pre-merge docs regression check | Memeriksa docs sebelum PR digabung | P0 |
| Pre-release docs verification | Menjalankan check sebelum publish package | P0 |
| Local maintainer validation | Maintainer menjalankan check lokal saat mengedit docs | P0 |
| Example drift detection | Mendeteksi examples tertinggal dari package | P1 |
| Migration guide validation | Menandai instruksi upgrade yang tidak sinkron | P1 |
| Machine-readable reporting | Mengintegrasikan hasil ke tool lain | P1 |

### 5.4 Use Case Sekunder

- Audit berkala kualitas docs lintas repo organisasi.
- Pemberian badge “Docs Verified”.
- Analisis area docs yang paling sering rusak.
- Menentukan bagian dokumentasi yang harus diprioritaskan pada release berikutnya.

## 6. Functional Requirements

### 6.1 Discovery Requirements
Sistem harus dapat menemukan file target berdasarkan default glob dan konfigurasi pengguna.

#### Wajib didukung pada MVP

- `README.md`
- `docs/**/*.md`
- `examples/**/*`
- `CHANGELOG.md`
- `MIGRATION.md`
- `.env.example`
- `*.example.json`
- `*.example.yaml`
- `*.example.yml`

#### Ketentuan discovery

- Ignore file biner.
- Ignore `node_modules`, `dist`, `build`, `.git`, `.next`, `coverage` secara default.
- Support include dan exclude pattern di config.
- Support mode `changed-only` untuk CI berbasis diff.

### 6.2 Parsing Requirements
Sistem harus mem-parse file markdown dan file contoh ke bentuk intermediate representation yang stabil.

#### Markdown parser harus mengekstrak:

- heading hierarchy
- paragraph context
- fenced code block
- inline code
- list item text
- table cell text bila relevan
- source location: file, line start, line end

#### Contoh artefak yang harus dikenali:

- shell commands
- import statements
- exported symbol references
- config keys
- package manager commands
- CLI invocations

### 6.3 Classification Requirements
Setiap extracted item harus diklasifikasikan minimal ke salah satu tipe berikut:

- `command`
- `code_snippet`
- `config_example`
- `api_reference`
- `script_reference`
- `migration_instruction`
- `environment_variable`

### 6.4 Resolution Requirements
Sistem harus dapat memetakan referensi docs ke codebase saat ini.

Contoh mapping wajib didukung pada MVP:

- import symbol di docs -> export aktual dari package
- `npm run build` -> script `build` di `package.json`
- `pnpm dev` -> script `dev` di `package.json`
- env var di docs -> key yang diketahui oleh config schema atau source pattern
- command CLI -> binary/subcommand yang diketahui project

### 6.5 Verification Requirements
MVP harus menyediakan checker berikut:

#### A. Syntax Checker
Memeriksa validitas sintaks dasar untuk snippet JS, TS, JSON, YAML, dan shell ringan.

#### B. Export Reference Checker
Memverifikasi bahwa symbol yang disebut dalam docs masih diekspor oleh entry points yang relevan.

#### C. Package Script Checker
Memverifikasi bahwa script yang disebut dalam docs tersedia di `package.json`.

#### D. Command Checker
Memverifikasi command umum seperti install, run, exec, dan CLI invocations secara statis.

#### E. Config Key Checker
Memverifikasi key konfigurasi dan env vars terhadap schema atau sumber kebenaran lain.

### 6.6 Reporting Requirements
Sistem harus menghasilkan minimal tiga bentuk output:

- ringkasan terminal
- detail finding per lokasi
- JSON report untuk integrasi lanjutan

Setiap finding wajib berisi:

- id unik
- checker name
- severity
- message
- file path
- line range
- code atau excerpt terkait
- suggestion jika tersedia
- metadata tambahan

### 6.7 CLI Requirements
CLI minimum harus mendukung:

- `docsguard init`
- `docsguard scan`
- `docsguard check`
- `docsguard report --format json`
- `docsguard check --changed-only`
- `docsguard check --fail-on high`

### 6.8 Configuration Requirements
Sistem konfigurasi harus mendukung:

- file `docsguard.config.json` atau `.docsguard.yml`
- include/exclude globs
- severity threshold
- checker enable/disable
- rule-level overrides
- repo preset selection
- output format selection

### 6.9 GitHub Action Requirements
GitHub Action harus:

- dapat dipakai pada pull_request dan push
- menginstall package dan menjalankan `docsguard check`
- gagal bila severity melewati threshold
- opsional menulis summary ke GitHub Step Summary

## 7. Non-Functional Requirements

### 7.1 Reliability

- Tidak boleh crash pada file yang tidak dikenali; harus fail gracefully.
- Error parser pada satu file tidak boleh menghentikan seluruh scan kecuali mode strict diaktifkan.
- Hasil scan yang sama pada input yang sama harus konsisten.

### 7.2 Performance

- Repo kecil-menengah harus selesai diproses cepat untuk kebutuhan CI.
- Proses parsing dan checks harus mendukung concurrency terkontrol.
- Mode `changed-only` harus tersedia untuk mempercepat PR scan.

### 7.3 Extensibility

- Checker baru harus bisa ditambahkan melalui interface yang eksplisit.
- Parser tambahan untuk bahasa lain harus dapat disisipkan tanpa refactor besar.
- Reporter baru harus mengikuti kontrak yang sama.

### 7.4 Usability

- CLI messages harus jelas dan tidak bertele-tele.
- Summary harus menampilkan status pass/fail, jumlah finding per severity, dan lokasi utama.
- Dokumentasi setup harus bisa diikuti maintainer dengan pengalaman menengah.

### 7.5 Determinism

- Tidak ada ketergantungan pada jaringan pada mode inti MVP.
- Output harus tidak bergantung pada urutan file sistem.
- Sorting findings harus stabil.

### 7.6 Compatibility

- Runtime target: Node.js LTS modern.
- Package manager kompatibel minimal dengan `npm`, `pnpm`, dan `yarn` untuk parsing perintah.
- Sistem operasi target: Linux, macOS, Windows untuk mode lokal; Linux untuk CI default.

### 7.7 Maintainability

- TypeScript strict mode wajib aktif.
- Unit test coverage pada modul inti target minimal 80%.
- Setiap checker wajib memiliki fixture tests.
- Perubahan data contract harus disertai migration note.

## 8. System Architecture

### 8.1 Arsitektur Logis
Docs Guard menggunakan arsitektur pipeline modular. Setiap tahap menerima input terstruktur dan menghasilkan output terstruktur sehingga mudah dites serta diganti sebagian tanpa mempengaruhi keseluruhan sistem.

### 8.2 Komponen Utama

| Komponen | Tanggung Jawab | Output |
|---|---|---|
| Collector | Menemukan file target | daftar file |
| Parser | Mengubah file menjadi IR | document IR |
| Classifier | Memberi tipe pada item | classified items |
| Resolver | Menghubungkan item docs ke code reality | resolved references |
| Verifier | Menjalankan aturan validasi | findings |
| Reporter | Menyajikan hasil | CLI/JSON summary |
| Config Loader | Memuat dan merge konfigurasi | runtime config |
| Project Analyzer | Membaca package.json, tsconfig, exports, schema | project metadata |

### 8.3 Prinsip Desain Arsitektur

- Semua checker membaca dari IR dan project metadata, bukan langsung dari raw file jika tidak perlu.
- Setiap checker harus pure sejauh mungkin: input jelas, output jelas, side effect minimal.
- Konteks file dan line range wajib dipertahankan dari parser hingga reporter.
- Error harus direpresentasikan sebagai diagnostic object, bukan exception mentah, kecuali fatal bootstrap error.

### 8.4 Lapisan Paket yang Direkomendasikan

- `core`: type system, config, orchestration, contracts
- `collectors`: file discovery
- `parsers`: markdown/config/source extraction
- `resolvers`: symbol/script/config resolution
- `checkers`: rules engine implementations
- `reporters`: terminal/json/github-summary
- `cli`: command surface
- `action`: GitHub Action wrapper
- `fixtures`: test repositories and snapshots

### 8.5 Dependency Direction
Arah dependensi harus satu arah:

1. `types/contracts`
2. `config`
3. `collectors/parsers/project-analysis`
4. `resolvers`
5. `checkers`
6. `reporters`
7. `cli/action`

`reporters` tidak boleh dipakai oleh `checkers`. `parsers` tidak boleh tergantung pada `cli`. `action` hanya boleh membungkus CLI atau core API yang stabil.

## 9. Processing Pipeline

### 9.1 Tahapan Pipeline Tingkat Tinggi

1. Load config
2. Discover files
3. Analyze project metadata
4. Parse documents and examples
5. Classify extracted artifacts
6. Resolve references against codebase
7. Run checkers
8. Aggregate findings
9. Render reports
10. Set process exit status

### 9.2 Detail Tahapan

#### Stage 1 — Config Load
- Baca default config.
- Merge dengan file config lokal.
- Override dengan CLI flags.
- Validasi schema config.

#### Stage 2 — Discovery
- Expand include globs.
- Apply ignore rules.
- Bila `changed-only`, batasi ke file hasil diff.
- Normalisasi path.

#### Stage 3 — Project Analysis
- Baca `package.json`.
- Ambil `scripts`, `name`, `bin`, `exports`, `main`, `module`, `types`.
- Bila ada `tsconfig.json`, ambil path aliases dan include utama.
- Analisis source entry points untuk export map dasar.
- Baca schema config bila ada sumber yang dikenali.

#### Stage 4 — Parse
- Parse markdown ke AST.
- Ekstrak snippet dan reference dari AST.
- Parse examples/config files secukupnya.
- Rekam lokasi sumber.

#### Stage 5 — Classify
- Tandai setiap item ke tipe semantik.
- Tambahkan metadata seperti language, fence info, heading context, execution hint.

#### Stage 6 — Resolve
- Map symbol ke export set.
- Map script reference ke package scripts.
- Map config key ke schema/source registry.
- Map CLI invocation ke binary atau subcommand yang diketahui.

#### Stage 7 — Verify
- Jalankan checker sesuai konfigurasi.
- Kumpulkan findings dan diagnostics.
- De-duplicate finding identik.

#### Stage 8 — Aggregate
- Urutkan findings secara stabil berdasarkan file, line, severity, checker.
- Hitung summary counts.
- Tentukan status akhir.

#### Stage 9 — Report
- Tampilkan ringkasan terminal.
- Tulis JSON bila diminta.
- Opsional tulis summary markdown untuk GitHub.

#### Stage 10 — Exit
- Tentukan exit code berdasarkan threshold.
- `0` jika pass, `1` jika fail karena finding, `2` jika runtime/config fatal error.

### 9.3 Pseudocode Pipeline
```ts
loadConfig()
discoverFiles()
analyzeProject()
parseArtifacts()
classifyArtifacts()
resolveReferences()
runCheckers()
aggregateFindings()
renderReports()
exitWithCode()
```

## 10. Rules Engine

### 10.1 Tujuan Rules Engine
Rules engine bertugas menjalankan checker secara konsisten terhadap kumpulan artifact terklasifikasi dan project context. Engine ini harus cukup generik sehingga checker baru dapat ditambahkan tanpa mengubah orchestration utama.

### 10.2 Checker Interface Konseptual
Setiap checker harus memiliki kontrak semacam berikut:

```ts
interface Checker {
  id: string
  description: string
  supports(input: CheckerContext): boolean
  run(input: CheckerContext): Promise<Finding[]>
}
```

### 10.3 Input CheckerContext Minimal

- runtime config
- project metadata
- parsed documents
- classified artifacts
- resolved references
- utility services seperti logger dan timing hooks

### 10.4 Daftar Checker MVP

| Checker ID | Tujuan | Severity default saat gagal |
|---|---|---|
| `syntax-js-ts` | snippet JS/TS invalid | high |
| `syntax-json-yaml` | config example invalid | medium |
| `package-script-exists` | script docs tidak ada | high |
| `export-reference-exists` | symbol docs tidak diekspor | high |
| `env-key-known` | env var tidak dikenal | medium |
| `cli-command-known` | command refer ke binary/subcommand tak dikenal | medium |

### 10.5 Severity Model
Severity harus baku dan dapat dikonfigurasi:

- `info`
- `low`
- `medium`
- `high`
- `critical`

Mapping severity override dapat dilakukan per checker atau per pattern file.

### 10.6 Rule Execution Strategy

- Jalankan checker per kategori input untuk efisiensi.
- Dukungan concurrency harus ada tetapi dibatasi.
- Checker boleh short-circuit hanya untuk file yang benar-benar tidak relevan.
- Runtime error checker tidak boleh menjatuhkan proses keseluruhan; ubah menjadi diagnostic kecuali fatal.

### 10.7 Finding De-duplication
Temuan yang identik harus digabung bila memiliki kombinasi sama pada:

- checker id
- file path
- start line
- normalized message

### 10.8 Rule Suppression
Harus tersedia mekanisme suppress yang eksplisit:

- ignore path via config
- disable checker globally
- severity downgrade
- optional inline suppression format untuk fase lanjutan

### 10.9 Prinsip Penulisan Checker Baru

1. Gunakan data contract yang ada, jangan mengakses filesystem secara liar.
2. Selalu kembalikan `Finding[]`.
3. Sertakan suggestion jika confidence tinggi.
4. Jangan menghasilkan false positive spekulatif pada MVP.
5. Tambahkan fixture test untuk kasus pass dan fail.

## 11. Data Contracts

### 11.1 Tujuan Data Contracts
Data contract memastikan semua modul berbicara dengan bahasa yang sama. Ini penting agar agent lain, contributor, dan implementer manusia dapat mengembangkan subsistem secara paralel tanpa ambigu.

### 11.2 Tipe Inti

```ts
export type Severity = 'info' | 'low' | 'medium' | 'high' | 'critical'

export interface SourceLocation {
  filePath: string
  startLine: number
  endLine: number
  startColumn?: number
  endColumn?: number
}

export interface ExtractedArtifact {
  id: string
  kind:
    | 'command'
    | 'code_snippet'
    | 'config_example'
    | 'api_reference'
    | 'script_reference'
    | 'migration_instruction'
    | 'environment_variable'
  language?: string
  raw: string
  normalized?: string
  headingPath: string[]
  location: SourceLocation
  metadata?: Record<string, unknown>
}

export interface ResolvedReference {
  artifactId: string
  status: 'resolved' | 'unresolved' | 'partial'
  targetType?: 'export' | 'script' | 'config_key' | 'cli_command' | 'env_var'
  targetPath?: string
  confidence: number
  metadata?: Record<string, unknown>
}

export interface Finding {
  id: string
  checkerId: string
  severity: Severity
  message: string
  suggestion?: string
  location: SourceLocation
  excerpt?: string
  docsReference?: string
  metadata?: Record<string, unknown>
}
```

### 11.3 Document IR Minimum

```ts
export interface ParsedDocument {
  filePath: string
  contentHash: string
  headings: { depth: number; text: string; line: number }[]
  artifacts: ExtractedArtifact[]
  diagnostics: ParseDiagnostic[]
}
```

### 11.4 Project Metadata Contract

```ts
export interface ProjectMetadata {
  packageName?: string
  packageManager?: 'npm' | 'pnpm' | 'yarn' | 'unknown'
  scripts: Record<string, string>
  exportsMap: Record<string, string[]>
  binaries: string[]
  configKeys: string[]
  envKeys: string[]
  tsconfigPaths?: Record<string, string[]>
}
```

### 11.5 Scan Result Contract

```ts
export interface ScanSummary {
  filesScanned: number
  docsFilesScanned: number
  artifactsExtracted: number
  findingsBySeverity: Record<Severity, number>
  durationMs: number
  passed: boolean
}

export interface ScanResult {
  summary: ScanSummary
  findings: Finding[]
  diagnostics: RuntimeDiagnostic[]
  version: string
}
```

### 11.6 Prinsip Versioning Contract

- Tambahkan field baru secara backward-compatible bila memungkinkan.
- Hindari rename field tanpa alias atau migration note.
- JSON output harus memiliki `version` untuk consumer agent.
- Major release digunakan bila schema output berubah secara breaking.

## 12. File and Folder Structure

### 12.1 Struktur Monorepo yang Direkomendasikan

```text
/docs-guard
  /packages
    /core
      /src
        /config
        /contracts
        /orchestrator
        /utils
      package.json
      tsconfig.json
    /collectors
      /src
        discovery.ts
        filters.ts
        changed-files.ts
      package.json
    /parsers
      /src
        markdown-parser.ts
        snippet-extractor.ts
        config-parser.ts
        source-loc.ts
      package.json
    /project-analyzer
      /src
        package-json.ts
        exports-analyzer.ts
        tsconfig-analyzer.ts
        config-schema-analyzer.ts
      package.json
    /resolvers
      /src
        export-resolver.ts
        script-resolver.ts
        config-resolver.ts
        cli-resolver.ts
      package.json
    /checkers
      /src
        syntax-js-ts.ts
        syntax-json-yaml.ts
        package-script-exists.ts
        export-reference-exists.ts
        env-key-known.ts
        cli-command-known.ts
      package.json
    /reporters
      /src
        terminal-reporter.ts
        json-reporter.ts
        github-summary-reporter.ts
      package.json
    /cli
      /src
        index.ts
        commands
          init.ts
          scan.ts
          check.ts
          report.ts
      package.json
    /action
      action.yml
      /src
        main.ts
      package.json
  /fixtures
    /repos
      /valid-basic
      /invalid-missing-script
      /invalid-missing-export
      /invalid-config-key
  /docs
    architecture.md
    rules.md
    output-schema.md
  /scripts
    build.mjs
    release.mjs
    test-fixtures.mjs
  package.json
  pnpm-workspace.yaml
  turbo.json
  tsconfig.base.json
  vitest.config.ts
  README.md
```

### 12.2 Penjelasan Direktori

- `packages/core`: kontrak inti, config, orchestration, error model.
- `packages/collectors`: logika pencarian file dan diff awareness.
- `packages/parsers`: parser markdown dan extractor artifact.
- `packages/project-analyzer`: pembacaan metadata repo.
- `packages/resolvers`: penghubung artifact docs ke code reality.
- `packages/checkers`: kumpulan rule/checker.
- `packages/reporters`: format output.
- `packages/cli`: antarmuka command line.
- `packages/action`: wrapper untuk GitHub Action.
- `fixtures/repos`: corpus test end-to-end.

### 12.3 Prinsip Penamaan File

- Nama file checker harus sama dengan `checkerId` sejauh mungkin.
- Hindari file util generik berisi banyak fungsi tak terkait.
- Setiap package memiliki `index.ts` untuk public surface yang eksplisit.
- Utility internal yang tidak stabil diletakkan di subfolder `internal` bila diperlukan.

## 13. Tech Stack

### 13.1 Bahasa dan Runtime

| Layer | Pilihan | Alasan |
|---|---|---|
| Core implementation | TypeScript | type safety, DX, cocok untuk OSS JS ecosystem |
| Runtime | Node.js LTS | kompatibilitas ekosistem tooling |
| Package manager | pnpm | cepat, hemat disk, cocok untuk monorepo |
| Build tool | tsup atau tsdown-style bundler sederhana | build cepat untuk package CLI |

### 13.2 Library yang Direkomendasikan

| Kebutuhan | Kandidat | Pilihan Awal |
|---|---|---|
| Markdown AST parsing | `remark`, `unified` | `remark` ecosystem |
| File globbing | `fast-glob` | `fast-glob` |
| CLI framework | `commander` atau `cac` | `cac` untuk ringan |
| Validation schema | `zod` | `zod` |
| YAML parsing | `yaml` | `yaml` |
| JSON with comments | `jsonc-parser` | `jsonc-parser` bila perlu |
| Testing | `vitest` | `vitest` |
| Snapshot/report test | built-in + custom fixtures | custom fixtures |
| Linting | `eslint` | `eslint` |
| Formatting | `prettier` | `prettier` |

### 13.3 Mengapa TypeScript adalah Pilihan Utama
TypeScript menurunkan ambiguitas kontrak data, sangat penting untuk tool modular seperti Docs Guard. Karena target pengguna awal adalah maintainer JS/TS, pemilihan stack ini juga mempercepat adopsi dan kontribusi.

### 13.4 Stack yang Sengaja Tidak Dipilih untuk MVP

- Rust: performa tinggi tetapi friction kontribusi lebih besar.
- Python: bagus untuk parsing, tetapi kurang natural untuk integrasi package metadata JS/TS.
- Full AST execution sandbox: terlalu berat untuk MVP.

### 13.5 Tooling Pendukung

- **Changesets** untuk versioning release.
- **GitHub Actions** untuk CI.
- **Turbo** opsional untuk task orchestration monorepo.
- **npm provenance / release signing** pada fase yang lebih matang.

## 14. Example User Flows

### 14.1 Flow A — Maintainer Lokal Sebelum Commit

1. Maintainer mengubah `README.md` dan source exports.
2. Maintainer menjalankan `pnpm docsguard check`.
3. Docs Guard menemukan satu import di README yang mengacu pada export lama.
4. Terminal report menunjukkan file, line, dan suggestion.
5. Maintainer memperbaiki docs lalu menjalankan ulang.
6. Status menjadi pass.

### 14.2 Flow B — Pull Request Validation

1. Kontributor membuka PR yang mengubah `package.json` scripts.
2. GitHub Action menjalankan Docs Guard.
3. Docs Guard mendeteksi docs masih menyebut `npm run start`, padahal script kini `dev`.
4. Check gagal dengan severity `high`.
5. Maintainer melihat summary dan meminta update docs sebelum merge.

### 14.3 Flow C — Release Verification

1. Tim akan merilis versi mayor.
2. Mereka menjalankan `docsguard check --fail-on medium`.
3. Tool memeriksa migration guide, config examples, dan commands.
4. JSON report diarsipkan sebagai artefak release QA.
5. Release hanya dilanjutkan jika hasil pass.

### 14.4 Flow D — Integrasi dengan Agent Lain
Agent seperti Gemini atau automation agent lain dapat memanggil Docs Guard lewat CLI, lalu membaca JSON output. Karena kontraknya stabil, agent dapat:

- mengelompokkan issue berdasarkan severity
- membuat draft PR docs fix
- memberi ringkasan ke maintainer
- mengusulkan area prioritas perbaikan

## 15. CLI Specification

### 15.1 Prinsip CLI
CLI harus singkat, prediktif, dan mudah di-*script*.

### 15.2 Command Surface

```bash
docsguard init
docsguard scan
docsguard check
docsguard report --input .docsguard/report.json --format markdown
```

### 15.3 Detail Command

#### `docsguard init`
Membuat file config dasar dan menambahkan dokumentasi singkat penggunaan.

Contoh:
```bash
docsguard init --preset library-ts
```

#### `docsguard scan`
Menjalankan discovery + parsing dan menghasilkan artifact summary tanpa fail pipeline secara agresif.

Contoh:
```bash
docsguard scan --format json --output .docsguard/scan.json
```

#### `docsguard check`
Menjalankan full validation pipeline.

Contoh:
```bash
docsguard check --fail-on high
docsguard check --changed-only
docsguard check --format json --output .docsguard/report.json
```

#### `docsguard report`
Mengubah JSON result menjadi tampilan lain seperti markdown summary.

### 15.4 Exit Codes

| Exit Code | Arti |
|---|---|
| 0 | semua pemeriksaan lolos sesuai threshold |
| 1 | terdapat finding yang melebihi threshold |
| 2 | fatal runtime/config error |

### 15.5 Flags Penting

- `--config <path>`
- `--format <terminal|json|markdown>`
- `--output <path>`
- `--fail-on <severity>`
- `--changed-only`
- `--base-ref <git-ref>`
- `--head-ref <git-ref>`
- `--debug`
- `--silent`

## 16. Config Specification

### 16.1 Contoh Config JSON

```json
{
  "version": 1,
  "include": ["README.md", "docs/**/*.md", "examples/**/*"],
  "exclude": ["**/node_modules/**", "**/dist/**"],
  "failOn": "high",
  "reporters": ["terminal", "json"],
  "output": {
    "json": ".docsguard/report.json"
  },
  "checkers": {
    "syntax-js-ts": true,
    "syntax-json-yaml": true,
    "package-script-exists": true,
    "export-reference-exists": true,
    "env-key-known": true,
    "cli-command-known": true
  },
  "overrides": [
    {
      "files": ["CHANGELOG.md"],
      "disable": ["export-reference-exists"]
    }
  ]
}
```

### 16.2 Field-Level Semantics

| Field | Tipe | Wajib | Fungsi |
|---|---|---|---|
| `version` | number | ya | versi schema config |
| `include` | string[] | tidak | pola file yang discan |
| `exclude` | string[] | tidak | pola file yang diabaikan |
| `failOn` | severity | tidak | ambang kegagalan |
| `reporters` | string[] | tidak | reporter aktif |
| `output` | object | tidak | path output reporter |
| `checkers` | record | tidak | aktif/nonaktif checker |
| `overrides` | array | tidak | override berbasis file pattern |

### 16.3 Presets yang Direkomendasikan

- `library-ts`
- `cli-ts`
- `monorepo-ts`
- `docs-heavy-package`

## 17. GitHub Action Specification

### 17.1 Tujuan
Memberikan cara adopsi tercepat bagi maintainer tanpa harus menyusun workflow dari nol.

### 17.2 Contoh Workflow

```yaml
name: Docs Guard

on:
  pull_request:
  push:
    branches: [main]

jobs:
  docs-guard:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: 9
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm docsguard check --format json --output .docsguard/report.json
```

### 17.3 Future Action Inputs
GitHub Action wrapper dapat mendukung input seperti:

- `config`
- `fail-on`
- `changed-only`
- `write-summary`
- `upload-json-artifact`

### 17.4 Perilaku PR
Pada fase awal cukup dengan fail/pass status. Pada fase lanjutan dapat ditambah step summary dan annotations.

## 18. Reporting Specification

### 18.1 Tujuan Reporting
Reporting harus dapat melayani dua konsumen sekaligus: manusia dan mesin.

### 18.2 Terminal Output Ideal

- status pass/fail yang jelas
- jumlah finding per severity
- daftar top findings dengan lokasi
- saran next action

Contoh ringkas:
```text
Docs Guard: FAILED
Files scanned: 18
Artifacts extracted: 62
Findings: 4 (high: 2, medium: 2)

[high] export-reference-exists  README.md:48
  `createDocsGuard` is referenced but not exported from package entrypoint
  Suggestion: update docs to `createGuard`
```

### 18.3 JSON Output Requirements
JSON output harus stabil, terdokumentasi, dan cocok untuk agent consumption.

```json
{
  "version": "1.0.0",
  "summary": {
    "filesScanned": 18,
    "docsFilesScanned": 7,
    "artifactsExtracted": 62,
    "findingsBySeverity": {
      "info": 0,
      "low": 0,
      "medium": 2,
      "high": 2,
      "critical": 0
    },
    "durationMs": 1820,
    "passed": false
  },
  "findings": [
    {
      "id": "F-001",
      "checkerId": "export-reference-exists",
      "severity": "high",
      "message": "Referenced symbol is not exported",
      "suggestion": "Replace createDocsGuard with createGuard",
      "location": {
        "filePath": "README.md",
        "startLine": 48,
        "endLine": 48
      }
    }
  ],
  "diagnostics": []
}
```

### 18.4 GitHub Summary Output
Format markdown ringkas yang menampilkan status, metrik utama, serta top N findings untuk reviewer PR.

### 18.5 Reporting Principles

- Jangan mengubur informasi utama dalam noise.
- Tampilkan lokasi file dengan jelas.
- Berikan suggestion hanya bila confidence cukup tinggi.
- JSON tidak boleh bercampur log debug.

## 19. Implementation Plan

### 19.1 Strategi Delivery
Pengembangan dilakukan bertahap agar setiap fase menghasilkan nilai yang bisa diuji dan dipublikasikan. Hindari membangun semua checker sekaligus. Fokus pada *thin vertical slices* dari discovery hingga reporting.

### 19.2 Fase Implementasi

| Fase | Fokus | Output |
|---|---|---|
| F0 | Bootstrap monorepo | workspace siap, lint/test/build jalan |
| F1 | Config + discovery + parser dasar | scan README/docs dan ekstraksi artifacts |
| F2 | Project analyzer + resolver dasar | scripts/exports/config registry tersedia |
| F3 | Checker MVP | syntax/script/export/env/cli checks aktif |
| F4 | Reporter + JSON contract | terminal & JSON report stabil |
| F5 | CLI polish + changed-only + CI | siap dipakai pada repo nyata |
| F6 | Fixtures + hardening | confidence sebelum release publik |
| F7 | GitHub Action wrapper | adopsi mudah di PR workflow |

### 19.3 Rincian Kerja per Fase

#### F0 — Bootstrap

- Inisialisasi monorepo.
- Setup TypeScript strict.
- Setup lint, format, unit test, changesets.
- Definisikan kontrak data inti.

#### F1 — Discovery dan Parsing

- Implement include/exclude globs.
- Implement markdown parser berbasis AST.
- Ekstrak fenced code block, inline code, command candidates, env var candidates.
- Simpan source location yang akurat.

#### F2 — Project Analysis dan Resolution

- Parse `package.json`.
- Bangun registry scripts.
- Bangun exports map dasar.
- Bangun config key registry dari source yang dikenali.
- Implement resolver untuk scripts, exports, config key, CLI commands.

#### F3 — Checker MVP

- Syntax checker JS/TS.
- Syntax checker JSON/YAML.
- Package script exists.
- Export reference exists.
- Env key known.
- CLI command known.

#### F4 — Reporting

- Terminal reporter human-friendly.
- JSON reporter contract-stable.
- Summary aggregation dan exit code.

#### F5 — CLI dan CI Optimization

- Tambahkan `changed-only`.
- Tambahkan `--fail-on`, `--format`, `--output`.
- Debug logging terstruktur.
- Baseline test pada sample repo.

#### F6 — Hardening

- Tambah fixture repos untuk edge case.
- Uji repo kosong, repo besar, config invalid, path aneh.
- Profiling bottleneck.
- Stabilkan diagnostic model.

#### F7 — Packaging dan Action

- Package publish pipeline.
- Action wrapper.
- Example workflows.
- Release docs.

### 19.4 Work Breakdown Structure

1. **Foundation track**: contracts, config, errors, utilities.
2. **Ingestion track**: discovery, parsing, artifact extraction.
3. **Reality track**: project analyzer, resolver.
4. **Policy track**: checker implementations.
5. **Delivery track**: reporter, CLI, GitHub Action.
6. **Quality track**: fixtures, tests, benchmarks, docs.

### 19.5 Perkiraan Urutan Eksekusi oleh Agent
Jika beberapa agent bekerja paralel, urutan aman adalah:

1. Agent A: contracts + config schema
2. Agent B: discovery + parser
3. Agent C: project analyzer
4. Agent D: checkers setelah contracts stabil
5. Agent E: reporters + CLI setelah output contracts stabil
6. Agent F: fixtures + tests + CI hardening

### 19.6 Risiko Delivery

| Risiko | Dampak | Mitigasi |
|---|---|---|
| Parser terlalu permisif | false positive/negative | fixture corpus beragam |
| Resolver exports tidak akurat | temuan salah | mulai dari kasus sederhana dahulu |
| Scope creep | MVP melambat | kunci scope pada checker bernilai tertinggi |
| JSON schema berubah sering | integrasi agent rusak | versioning dan compatibility policy |
| CI terlalu lambat | enggan diadopsi | changed-only + caching |

## 20. Testing Strategy

### 20.1 Prinsip Testing
Karena Docs Guard adalah tool validasi, kualitas testing harus sangat tinggi. Fokusnya bukan hanya code coverage, tetapi *behavior coverage* terhadap kasus docs nyata.

### 20.2 Pyramid Testing

| Level | Fokus | Contoh |
|---|---|---|
| Unit | fungsi/parser/checker tunggal | normalize command, parse heading, severity mapping |
| Integration | modul bekerja bersama | parse + resolve + checker untuk satu fixture |
| End-to-End | CLI pada sample repo | `docsguard check` pada repo valid/invalid |
| Contract | output JSON stabil | snapshot schema dan payload |

### 20.3 Test Corpus Minimum

- repo valid sederhana
- repo dengan script hilang
- repo dengan export hilang
- repo dengan config key salah
- repo dengan YAML invalid
- repo dengan docs banyak namun tanpa temuan
- repo monorepo ringan

### 20.4 Test Cases Penting

- fenced code block tanpa language
- inline command di list item
- import default vs named export
- `package.json` tanpa field `scripts`
- `exports` field berbentuk object kompleks
- Windows style path normalization
- duplicate findings dari artifact identik
- override config per file pattern

### 20.5 Snapshot Policy
Snapshot boleh dipakai untuk JSON report dan terminal output ringkas, tetapi tidak boleh menjadi satu-satunya bentuk verifikasi. Assertion terhadap field penting tetap wajib.

### 20.6 Regression Strategy
Setiap bug yang ditemukan pada repo nyata harus ditambah menjadi fixture regression permanen.

## 21. Security and Safety

### 21.1 Prinsip Dasar
Docs Guard MVP bersifat *offline-first* dan tidak membutuhkan network access untuk fungsi utama. Ini menurunkan risiko supply-side variability dan membuat hasil lebih deterministik.

### 21.2 Postur Keamanan MVP

- Tidak mengeksekusi snippet arbitrer pada fase awal.
- Tidak mengirim source code ke layanan eksternal.
- Tidak memodifikasi file pengguna secara otomatis.
- Tidak menjalankan shell command docs kecuali fitur execution sandbox resmi hadir di fase berikutnya.

### 21.3 Hal yang Harus Diwaspadai

- File berukuran sangat besar.
- Markdown yang dirancang untuk memecah parser.
- Path traversal pada pemrosesan path relatif.
- Output injection ke terminal atau markdown summary.

### 21.4 Mitigasi

- Batasi ukuran file yang diparse bila perlu.
- Escape output saat merender summary.
- Normalisasi semua path.
- Pisahkan diagnostic fatal dari user-facing findings.

## 22. Performance Strategy

### 22.1 Sasaran Kinerja
Tool harus cukup cepat untuk menjadi bagian rutin dari CI, bukan hanya alat audit sesekali.

### 22.2 Strategi Teknis

- Scan hanya file yang relevan.
- Cache metadata repo selama satu run.
- Hindari parse source berulang.
- Gunakan concurrency terbatas untuk parsing dan checking.
- Gunakan hashing bila nanti ingin mendukung incremental mode.

### 22.3 Benchmark Targets

| Ukuran Repo | Target Waktu |
|---|---|
| kecil <= 50 file relevan | < 5 detik |
| menengah <= 300 file relevan | < 15 detik |
| besar <= 1000 file relevan | < 45 detik pada mode default |

### 22.4 Hotspots yang Diperkirakan

- markdown AST parsing
- export map analysis
- glob expansion pada monorepo besar
- report rendering dengan finding sangat banyak

## 23. Release Plan

### 23.1 Tahapan Release

1. Internal alpha pada fixture repos.
2. Private dogfooding pada 3-5 repo nyata.
3. Public beta dengan scope checker terbatas.
4. v1.0 setelah false positive terkendali dan docs matang.

### 23.2 Kriteria Sebelum Public Beta

- CLI stabil di Linux/macOS/Windows.
- JSON contract terdokumentasi.
- Minimal lima checker MVP stabil.
- Minimal lima fixture regression berkualitas.
- README dan quick start jelas.

### 23.3 SemVer Policy

- Patch: bug fix dan stabilisasi tanpa breaking output.
- Minor: checker baru, reporter baru, config field baru non-breaking.
- Major: perubahan kontrak output, rename command, perubahan severity semantics.

## 24. Contribution Model

### 24.1 Prinsip Kontribusi
Repo harus mudah dikontribusikan, terutama oleh maintainer OSS dan engineer tooling.

### 24.2 Standar Contribution

- Setiap feature baru harus diawali issue atau design note singkat.
- Checker baru wajib menyertakan fixture pass/fail.
- Perubahan pada output JSON wajib memperbarui dokumentasi schema.
- Semua PR wajib lulus lint, test, dan Docs Guard pada repo ini sendiri.

### 24.3 Template PR yang Direkomendasikan

- Masalah apa yang diselesaikan
- Pendekatan yang dipilih
- Risiko atau trade-off
- Test coverage yang ditambahkan
- Contoh output sebelum/sesudah bila relevan

## 25. Agent Execution Brief

### 25.1 Tujuan Dokumen Ini untuk Agent
Dokumen ini harus cukup lengkap sehingga agent lain dapat langsung bekerja tanpa harus menebak arsitektur, tujuan, kontrak data, ataupun urutan implementasi.

### 25.2 Instruksi Kerja untuk Agent Implementasi

1. Mulai dari kontrak data dan config schema.
2. Bangun discovery dan markdown parsing sebelum checker.
3. Jangan implement auto-fix atau AI features pada MVP.
4. Jaga JSON output tetap stabil.
5. Setiap modul baru harus memiliki test.
6. Jika ada ambiguitas, pilih solusi yang paling deterministik dan paling mudah diuji.

### 25.3 Definition of Good Output untuk Agent
Output dianggap baik jika:

- modular
- type-safe
- mudah dites
- tidak menambah scope di luar dokumen
- konsisten dengan data contract
- memprioritaskan false positive rendah

### 25.4 Larangan untuk Agent

- Jangan menambah network dependency untuk core path.
- Jangan mengubah schema output tanpa versioning.
- Jangan mencampur CLI formatting dengan core logic.
- Jangan mengeksekusi snippet user secara langsung pada MVP.

## 26. Acceptance Criteria

### 26.1 Acceptance Criteria Produk

- Docs Guard dapat diinstal dan dijalankan pada repo JS/TS.
- Dapat menemukan minimal kelas masalah docs drift yang ditargetkan MVP.
- Menghasilkan CLI report yang jelas dan JSON report yang stabil.
- Dapat dipakai di local dan GitHub Actions.
- Tidak memiliki false positive dominan pada fixture corpus awal.

### 26.2 Acceptance Criteria Engineering

- Monorepo rapi dan modular.
- TypeScript strict lulus.
- Test suite hijau.
- Coverage inti memadai.
- Build dan publish pipeline terdokumentasi.

### 26.3 Acceptance Criteria Dokumentasi

- README menjelaskan value proposition, install, usage, config, output.
- `docs/architecture.md` menjelaskan arsitektur dan dependency flow.
- `docs/output-schema.md` menjelaskan JSON contract.
- Dokumen ini sendiri cukup bagi implementer baru untuk memulai kerja.

## 27. Appendix

### 27.1 Contoh Roadmap Lanjutan

- execution sandbox untuk snippet aman
- resolver plugin system
- SARIF reporter
- GitHub PR annotations
- support multi-language ecosystems
- docs health score
- autofix suggestions berbasis rule intelligence

### 27.2 Pertanyaan yang Seharusnya Sudah Terjawab oleh Dokumen Ini

- Apa masalah utama yang diselesaikan Docs Guard?
- Siapa pengguna utamanya?
- Apa scope MVP dan apa yang sengaja ditunda?
- Bagaimana arsitektur dan dependency flow-nya?
- Apa kontrak data utamanya?
- File structure seperti apa yang direkomendasikan?
- Stack apa yang dipakai dan mengapa?
- Bagaimana alur CLI, config, CI, dan reporting?
- Bagaimana agent lain dapat mengintegrasikan outputnya?
- Apa urutan implementasi paling aman?
- Apa acceptance criteria rilis awal?

### 27.3 Catatan Penutup
Dokumen ini dimaksudkan sebagai **master working specification**. Jika implementasi kelak menemukan kebutuhan baru, perubahan harus masuk melalui prinsip: tetap modular, tetap deterministik, tetap backward-aware, dan tetap fokus pada pengurangan docs drift yang nyata.

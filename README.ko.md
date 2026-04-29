<p align="right">
  <a href="README.md">English</a> | 한국어 | <a href="README.ja.md">日本語</a>
</p>

# PureData-MCP

<p align="center">
  <img src="icon.png" width="160" alt="PureData-MCP icon">
</p>

[Pure Data](https://puredata.info/)를 AI 에이전트가 MCP를 통해 실행하고, 제어하고, 실시간으로 패치할 수 있게 해주는 서버입니다.

PureData-MCP는 MCP 클라이언트가 Pd를 실행하고, 보이는 GUI 패치를 열고, Vanilla `.pd` 패치를 생성하고, 실행 중인 패치의 오브젝트와 연결을 수정할 수 있게 합니다. 목표는 단순합니다. 자연어로 소리를 요청하고, Pure Data가 악기가 되어가는 장면을 보는 것입니다.

Pure Data, 또는 Pd/Pd Vanilla는 Miller Puckette가 만들고 Pd 커뮤니티가 유지해온 오픈소스 멀티미디어 비주얼 프로그래밍 언어입니다. 이 프로젝트는 Pure Data 프로젝트와 독립적이며 공식 제휴 또는 보증 관계가 아닙니다. 이런 작업을 가능하게 해준 Pure Data 제작자와 커뮤니티에 감사드립니다.

## 빠른 시작

[Pure Data](https://puredata.info/downloads)와 Node.js 20 이상을 설치한 뒤, npm으로 MCP 서버를 실행할 수 있습니다.

```bash
npx -y @damagethundercat/puredata-mcp
```

대부분의 사용자는 이 명령을 직접 실행하기보다 Codex, Claude Code, Cursor, VS Code 같은 MCP 클라이언트 설정에 추가하게 됩니다.

## Codex에 연결하기

Codex MCP 설정에 추가하세요.

```toml
[mcp_servers.puredata]
command = "npx"
args = ["-y", "@damagethundercat/puredata-mcp"]
```

Windows에서는 PowerShell의 npm 정책 문제를 피하기 위해 `cmd /c`를 사용하는 편이 좋습니다.

```toml
[mcp_servers.puredata]
command = "cmd"
args = ["/c", "npx", "-y", "@damagethundercat/puredata-mcp"]
```

설정을 바꾼 뒤 Codex를 다시 시작하세요.

## 다른 MCP 클라이언트

JSON MCP 설정을 쓰는 클라이언트에서는 다음처럼 추가합니다.

```json
{
  "mcpServers": {
    "puredata": {
      "command": "npx",
      "args": ["-y", "@damagethundercat/puredata-mcp"]
    }
  }
}
```

Windows에서는 다음처럼 설정합니다.

```json
{
  "mcpServers": {
    "puredata": {
      "command": "cmd",
      "args": ["/c", "npx", "-y", "@damagethundercat/puredata-mcp"]
    }
  }
}
```

## 사용해보기

서버를 연결한 뒤 에이전트에게 이렇게 요청해보세요.

```text
osc~ -> *~ -> dac~ 신호 흐름이 보이는 Pure Data 패치를 만들어주세요.
```

```text
Pure Data GUI 창 하나에 킥, 하이햇, 베이스, 믹서, dac~가 보이게 120BPM 전자음악 루프를 만들어주세요.
```

```text
현재 패치에 딜레이 이펙트를 추가하고 출력은 조용하게 유지해주세요.
```

```text
베이스 섹션을 왼쪽으로 옮기고, 기존 하이햇 오브젝트를 제거한 뒤 믹서에 다시 연결해주세요.
```

## 할 수 있는 일

- 로컬 Pure Data 시작/종료
- headless Pd 또는 보이는 Pd GUI 실행
- 작은 Vanilla `.pd` 패치 생성
- TCP FUDI로 frequency, amplitude, gate, DSP 제어
- 에이전트가 소유한 live patch graph의 추가, 연결, 이동, 수정, 제거, 교체, 초기화, 조회
- 오디오 장치 목록과 세션 상태/로그 확인

## 도구

PureData-MCP는 작은 MCP 도구 세트를 제공합니다.

- Lifecycle: `pd_start_demo`, `pd_stop`, `pd_status`
- Audio: `pd_set_params`, `pd_list_audio_devices`
- Patch preview: `pd_preview_patch`
- Live GUI editing: `pd_live_add_object`, `pd_live_connect`, `pd_live_move_object`, `pd_live_update_object`, `pd_live_remove_object`, `pd_live_disconnect`, `pd_live_replace_graph`, `pd_live_clear`, `pd_live_graph`

Live editing 도구를 사용하면 에이전트가 실행 중인 Pure Data GUI 패치를 만들고 수정할 수 있습니다.

## 리소스

- `pd://session/status`
- `pd://patch/current`
- `pd://logs/recent`
- `pd://schema/parameters`
- `pd://live/graph`

## 로컬 데모

포함된 데모를 직접 실행하려면 저장소를 클론하세요.

```bash
git clone https://github.com/damagethundercat/PureData-MCP.git
cd PureData-MCP
npm install
npm run build
```

현재 전자음악 리듬 데모를 실행합니다.

```bash
npm run demo:electro
```

Windows PowerShell에서는 다음을 권장합니다.

```powershell
cmd /c npm run demo:electro
```

데모 패치는 `patches/electro-rhythm-loop.pd`에 있습니다.

## 개발

```bash
npm run test:unit
npm run typecheck
npm run build
```

선택적으로 Pd 통합 테스트를 실행할 수 있습니다.

```bash
PD_INTEGRATION=1 PD_EXE="/path/to/pd" npm run test:pd
```

Windows:

```powershell
$env:PD_EXE="C:\Program Files\Pd\bin\pd.com"
$env:PD_INTEGRATION="1"
cmd /c npm run test:pd
```

## 문제 해결

- Pd를 찾지 못하면 headless 세션에는 `PD_EXE`, GUI 세션에는 `PD_GUI_EXE`를 설정하세요.
- 소리가 나지 않거나 잘못된 장치로 출력되면 에이전트에게 `pd_list_audio_devices`를 실행하게 한 뒤 올바른 `audioOutDevice`로 다시 시작하세요.
- Windows에서 PowerShell이 npm 스크립트를 막으면 `cmd /c npm ...`으로 실행하세요.

## 라이선스

MIT

# 🐍 Snake Draft Simulator (2025 CHZZK CUP)

**스네이크 드래프트(Snake Draft)** 방식을 사용하여 팀장들에게 공정하게 선수를 배분하는 시뮬레이터입니다.
2025 자낳대(치지직 컵) 드래프트를 모의로 진행해볼 수 있도록 개발되었습니다.

## ✨ 주요 기능

### 1. 다양한 게임 모드
- **혼자 해보기 (Preset Mode)**: 미리 설정된 데이터로 혼자서 드래프트 시스템을 체험해볼 수 있습니다.
- **AI와 해보기 (Solo AI Mode)**: AI 봇들과 함께 실제 드래프트처럼 경쟁하며 연습할 수 있습니다.
- **멀티플레이 (Multiplayer Mode)**: **P2P 연결(PeerJS)**을 통해 방장이 방을 만들고, 친구들을 초대하여 실시간으로 드래프트를 진행할 수 있습니다.

### 2. 드래프트 시스템
- **스네이크 방식**: 1-2-3-4-5-5-4-3-2-1 순서로 공정하게 픽 순서가 돌아갑니다.
- **포지션 제한**: 각 팀은 TOP, JUNGLE, MID, BOT, SUP 포지션을 하나씩 채워야 합니다.
- **포인트 시스템**: 각 선수의 등급(Tier)과 점수(Score)를 고려하여 팀을 구성할 수 있습니다.

### 3. 편의 기능
- **드래그 앤 드롭**: 팀 순서를 직관적으로 변경할 수 있습니다.
- **되돌리기 (Undo)**: 실수로 픽을 했을 경우 이전 상태로 되돌릴 수 있습니다 (싱글 모드).
- **실시간 동기화**: 멀티플레이 시 모든 참여자의 화면이 실시간으로 동기화됩니다.

## 🛠 기술 스택 (Tech Stack)

- **Frontend**: React, TypeScript, Vite
- **Styling**: Tailwind CSS
- **State Management**: Zustand (Local & Session Persistence)
- **Real-time Communication**: PeerJS (WebRTC P2P)
- **Icons**: Lucide React

## 🚀 설치 및 실행 방법

```bash
# 1. 저장소 클론
git clone https://github.com/your-username/draftsimulator.git

# 2. 패키지 설치
npm install

# 3. 개발 서버 실행
npm run dev
```

## 🌐 배포 (Deployment)

이 프로젝트는 **Vercel** 또는 **Netlify**를 통해 무료로 쉽게 배포할 수 있습니다.
PeerJS를 사용하므로 HTTPS 환경(Vercel/Netlify 기본 제공)에서 원활하게 작동합니다.

---
Developed for 2025 CHZZK CUP Fan Project.

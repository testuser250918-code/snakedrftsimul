# 프로젝트 기획서: 팀 빌딩 스네이크 드래프트 시뮬레이터

## 1. 프로젝트 개요

**목적**: 5명의 팀장이 4개 포지션의 선수(총 20명)를 스네이크 드래프트 방식으로 선발하는 웹 시뮬레이터 구현.

**핵심 기능**: 
- CSV 데이터 입력
- 드래프트 순서 정하기
- 스네이크 방식 로직(1->5, 5->1)
- 되돌리기(Undo)
- 상태 저장 및 복구

**확장성 고려**: 추후 드래그 앤 드롭 및 온라인 멀티플레이(Socket) 기능 추가 예정.

## 2. 기술 스택 (Tech Stack)

- **Framework**: React (Vite 기반) - 빠른 설정과 사용자 익숙함
- **Language**: TypeScript - 데이터 구조의 명확성을 위해 필수
- **Styling**: Tailwind CSS - AI가 UI를 빠르게 구성하기에 최적
- **State Management**: Zustand - Redux보다 가볍고, 되돌리기(Undo) 로직 구현이 용이하며 확장성이 좋음
- **Data Parsing**: PapaParse - CSV 파싱용
- **Icons**: Lucide React or Heroicons

## 3. 데이터 구조 명세 (Data Structure)

```typescript
// 포지션 타입
type Position = 'Position1' | 'Position2' | 'Position3' | 'Position4';

// 선수 정보
interface Player {
  id: string;
  name: string;
  position: Position;
  isDrafted: boolean; // 선택 여부
  draftedBy: string | null; // 어느 팀장에게 갔는지 (teamId)
}

// 팀(팀장) 정보
interface Team {
  id: string;
  leaderName: string;
  roster: {
    [key in Position]?: Player; // 포지션별로 선수가 들어감 (슬롯)
  };
  draftOrderIndex: number; // 0~4 (드래프트 순서)
}

// 전체 상태 관리 (Store)
interface DraftState {
  step: 'HOME' | 'INPUT' | 'ORDER_SETTING' | 'DRAFTING'; // 현재 화면 단계
  teams: Team[];
  players: Player[];
  
  // 드래프트 로직 관련
  currentRound: number; // 1~4 라운드
  currentPickIndex: number; // 전체 픽 순서 (0 ~ 19)
  draftHistory: DraftStateSnapshot[]; // Undo를 위한 스냅샷 스택
  
  // Actions
  uploadData: (csv: string) => void;
  setDraftOrder: (order: string[]) => void; // 팀장 ID 배열
  pickPlayer: (playerId: string) => void;
  undo: () => void;
  reset: () => void;
}
```

## 4. 기능 상세 명세 (Functional Specs)

### A. 데이터 입력 (Input Phase)
- **포맷**: CSV 또는 엑셀 텍스트 붙여넣기 지원.
- **검증**:
    - 팀장 5명 필수.
    - 포지션 4개, 각 포지션당 선수 5명 (총 20명) 필수.
- **파싱 로직**: 첫 줄을 팀장 목록, 이후 줄을 포지션별 선수 목록으로 매핑.

### B. 드래프트 순서 정하기 (Order Phase)
- **기능**: 5명의 팀장 이름을 나열하고, 위/아래로 순서를 바꿀 수 있음 (초기 버전은 랜덤 셔플 버튼 제공).
- **확정**: '드래프트 시작' 버튼을 누르면 `draftOrderIndex`가 고정되고 픽 순서 큐(Queue)가 생성됨.

### C. 스네이크 드래프트 엔진 (Draft Engine)
- **순서 생성**:
    - Round 1: Team 1 → 2 → 3 → 4 → 5
    - Round 2: Team 5 → 4 → 3 → 2 → 1
    - Round 3: Team 1 → 2 → ...
    - Round 4: Team 5 → 4 → ...
- **제약 조건**:
    - 포지션 중복 불가: 팀 A가 이미 '포지션1' 선수를 가지고 있다면, '포지션1' 카드는 비활성화(Dimmed) 되거나 클릭 시 경고.
    - (이번 프로젝트의 경우 각 포지션별로 딱 1명씩 들어가므로, 이미 해당 포지션 슬롯이 찬 경우 선택 불가 처리)

### D. 네비게이션 및 유틸리티
- **Undo (되돌리기)**: Backspace 키 또는 화면 내 '되돌리기' 버튼 클릭 시, 가장 최근의 `pickPlayer` 액션을 취소하고 이전 상태로 복구.
- **Exit**: 언제든 홈 화면으로 돌아가는 버튼 (데이터 초기화 경고 팝업).

## 5. 화면 설계 (UI/UX Specifications)

### 화면 1: Home
- 중앙에 큰 타이틀 "Team Building Simulator".
- "새 드래프트 시작하기" 버튼.

### 화면 2: Data Input
- **좌측**: 텍스트 입력 영역 (Placeholder로 예시 포맷 보여줌).
- **우측**: 파싱된 데이터를 미리 보여주는 테이블 (팀장 리스트, 포지션별 선수 리스트).
- **하단**: "다음 단계(순서 정하기)" 버튼.

### 화면 3: Order Setting
- 팀장 5명의 카드 리스트.
- 드래그 앤 드롭(추후) 또는 '위로', '아래로', '랜덤 섞기' 버튼.

### 화면 4: Main Draft (핵심)
**[Layout: Flex Row]**

**Left Panel (선수 풀 - Player Pool)**
- **Grid**: 4행 5열 (세로축: 포지션, 가로축: 선수들).
- **Card**: 선수 이름 표시.
- **Interaction**:
    - 선택 가능: 흰색 배경 + 호버 효과.
    - 선택됨(Drafted): 회색 배경 + 흐림 처리.
    - 선택 불가(포지션 중복): 붉은 빗금 또는 클릭 불가 커서.

**Right Panel (팀 현황 - Team Boards)**
- **List**: 5개의 팀 컨테이너가 세로로 나열.
- **Active State**: 현재 순서인 팀장의 컨테이너는 **굵은 테두리 & 하이라이트 컬러(노란색 등)**로 강조.
- **Slots**: 각 팀장 이름 옆에 4개의 빈 슬롯(포지션 아이콘 표시). 선수가 선택되면 해당 슬롯에 이름이 채워짐.

**Controls**:
- **상단/하단 고정바**: "이전 단계", "되돌리기(Undo)", "나가기".
- **현재 픽 정보 표시**: "Round 2 - Pick 3: [팀장 이름]님의 차례입니다."

## 6. 컴포넌트 구조 (Component Hierarchy)
- `App.tsx`
- `Layout.tsx` (공통 헤더/푸터/배경)
- `PageContainer.tsx` (Step에 따라 아래 컴포넌트 렌더링)
    - `Home.tsx`
    - `InputForm.tsx`
    - `OrderSetting.tsx`
    - `DraftBoard.tsx`
        - `PlayerPool.tsx`
            - `PlayerCard.tsx`
        - `TeamList.tsx`
            - `TeamRow.tsx` (팀장 1명의 상태)
                - `Slot.tsx` (선수 들어갈 자리)
        - `ControlPanel.tsx` (Undo/Exit 버튼)

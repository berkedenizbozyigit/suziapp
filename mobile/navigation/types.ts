// Navigation param lists — typed so screens get autocompletion on route params.

export type RootStackParamList = {
  Tabs: undefined;
  /** Full-screen swipe deck. Seeded by a text query, an image (data URI), and/or
   *  a folder context. `imageDataUri` powers visual search (Phase 4). */
  Swipe: {
    query?: string;
    folderId?: string;
    folderName?: string;
    imageDataUri?: string;
  };
  /** A folder ("conversation") detail: its saved items + "continue this search".
   *  folderId null is the "All saves" pseudo-folder (unfiled saves). */
  FolderDetail: {
    folderId: string | null;
    folderName: string;
    queryText?: string | null;
  };
};

export type TabsParamList = {
  Discover: undefined;
  Picks: undefined;
  AskSuzi: undefined;
  WindowShop: undefined;
  Profile: undefined;
};

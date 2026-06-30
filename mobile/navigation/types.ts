// Navigation param lists — typed so screens get autocompletion on route params.

export type RootStackParamList = {
  Tabs: undefined;
  /** Full-screen swipe deck. Seeded by a text query and/or a folder context. */
  Swipe: {
    query?: string;
    folderId?: string;
    folderName?: string;
  };
};

export type TabsParamList = {
  Discover: undefined;
  Picks: undefined;
  AskSuzi: undefined;
  WindowShop: undefined;
  Profile: undefined;
};

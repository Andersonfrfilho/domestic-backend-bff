export interface TabBarItem {
  id: string;
  label: string;
  icon: string;
  route: string;
  visible: boolean;
  badge?: number | null;
}

export interface TabBar {
  visible: boolean;
  items: TabBarItem[];
}

export interface HeaderAction {
  id: string;
  icon: string;
  action: string;
}

export interface NavigationHeader {
  title: string | null;
  showBack: boolean;
  actions: HeaderAction[];
}

export interface Navigation {
  tabBar: TabBar;
  header: NavigationHeader;
}

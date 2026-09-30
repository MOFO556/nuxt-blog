import type { FilteredNavigationMenuItem } from "~/types/core";

export const useNavigationItems = () => {
  const route = useRoute();
  const userStore = useUserStore();

  const items = computed<FilteredNavigationMenuItem[]>(() => [{
    label: 'Public blog',
    to: '/posts',
    icon: 'i-lucide-book-open-check',
    active: route.path.startsWith('/posts'),
    filterKeys: ['guest', 'auth', 'mobile', 'inline']
  }, {
    label: 'Profile',
    to: '/office/profile',
    icon: 'i-lucide-book-user',
    active: route.path.startsWith('/office/'),
    filterKeys: ['auth', 'mobile', 'inline']
  }, {
    label: 'Login',
    icon: 'i-lucide-user-key',
    to: '/auth/login',
    active: route.path.startsWith('/auth/login'),
    filterKeys: ['guest', 'mobile', 'popover']
  }, {
    label: 'Logout',
    icon: 'i-lucide-user-key',
    onSelect() {    
      userStore.logout();
    },
    filterKeys: ['auth', 'mobile', 'popover']
  }]);

  return { items };
};

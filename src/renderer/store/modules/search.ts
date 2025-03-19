import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useSearchStore = defineStore('search', () => {
  const searchValue = ref('');
  const searchType = ref(1);

  const setSearchValue = (value: string) => {
    searchValue.value = value;
  };

  const setSearchType = (type: number) => {
    searchType.value = type;
  };

  return {
    searchValue,
    searchType,
    setSearchValue,
    setSearchType
  };
});

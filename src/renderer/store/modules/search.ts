import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useSearchStore = defineStore('search', () => {
  const searchValue = ref('');

  const setSearchValue = (value: string) => {
    searchValue.value = value;
  };

  return {
    searchValue,
    setSearchValue
  };
});

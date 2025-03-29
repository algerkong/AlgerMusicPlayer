import { useRouter } from 'vue-router';

export const useArtist = () => {
  const router = useRouter();

  /**
   * 跳转到歌手详情页
   * @param id 歌手ID
   */
  const navigateToArtist = (id: number) => {
    router.push(`/artist/detail/${id}`);
  };

  return {
    navigateToArtist
  };
};

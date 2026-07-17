import { useRouter } from 'vue-router';

export const useArtist = () => {
  const router = useRouter();

  /**
   * 跳转到歌手详情页
   * @param id 歌手 ID（string 优先，兼容 number）
   */
  const navigateToArtist = (id: number | string) => {
    router.push(`/artist/detail/${encodeURIComponent(String(id))}`);
  };

  return {
    navigateToArtist
  };
};

export interface IArtistDetail {
  videoCount: number;
  vipRights: VipRights;
  identify: Identify;
  artist: IArtist;
  blacklist: boolean;
  preferShow: number;
  showPriMsg: boolean;
  secondaryExpertIdentiy: SecondaryExpertIdentiy[];
  eventCount: number;
  user: User;
}

interface User {
  backgroundUrl: string;
  birthday: number;
  detailDescription: string;
  authenticated: boolean;
  gender: number;
  city: number;
  signature: null;
  description: string;
  remarkName: null;
  shortUserName: string;
  accountStatus: number;
  locationStatus: number;
  avatarImgId: number;
  defaultAvatar: boolean;
  province: number;
  nickname: string;
  expertTags: null;
  djStatus: number;
  avatarUrl: string;
  accountType: number;
  authStatus: number;
  vipType: number;
  userName: string;
  followed: boolean;
  userId: number;
  lastLoginIP: string;
  lastLoginTime: number;
  authenticationTypes: number;
  mutual: boolean;
  createTime: number;
  anchor: boolean;
  authority: number;
  backgroundImgId: number;
  userType: number;
  experts: null;
  avatarDetail: AvatarDetail;
}

interface AvatarDetail {
  userType: number;
  identityLevel: number;
  identityIconUrl: string;
}

interface SecondaryExpertIdentiy {
  expertIdentiyId: number;
  expertIdentiyName: string;
  expertIdentiyCount: number;
}

export interface IArtist {
  id: number;
  cover: string;
  avatar: string;
  name: string;
  transNames: any[];
  alias: any[];
  identities: any[];
  identifyTag: string[];
  briefDesc: string;
  rank: Rank;
  albumSize: number;
  musicSize: number;
  mvSize: number;
}

interface Rank {
  rank: number;
  type: number;
}

interface Identify {
  imageUrl: string;
  imageDesc: string;
  actionUrl: string;
}

interface VipRights {
  rightsInfoDetailDtoList: RightsInfoDetailDtoList[];
  oldProtocol: boolean;
  redVipAnnualCount: number;
  redVipLevel: number;
  now: number;
}

interface RightsInfoDetailDtoList {
  vipCode: number;
  expireTime: number;
  iconUrl: null;
  dynamicIconUrl: null;
  vipLevel: number;
  signIap: boolean;
  signDeduct: boolean;
  signIapDeduct: boolean;
  sign: boolean;
}

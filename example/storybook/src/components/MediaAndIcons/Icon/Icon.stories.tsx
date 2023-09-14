import type { ComponentMeta } from '@storybook/react-native';
import Icon, {
  AddIcon,
  AlertCircleIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  ArrowRightIcon,
  ArrowLeftIcon,
  AtSignIcon,
  BellIcon,
  CalendarDaysIcon,
  CheckIcon,
  CheckCircleIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronsLeftIcon,
  ChevronsRightIcon,
  ChevronsUpDownIcon,
  CircleIcon,
  ClockIcon,
  CloseIcon,
  CloseCircleIcon,
  CopyIcon,
  DownloadIcon,
  EditIcon,
  EyeIcon,
  EyeOffIcon,
  FavouriteIcon,
  GlobeIcon,
  GripVerticalIcon,
  HelpCircleIcon,
  InfoIcon,
  LinkIcon,
  ExternalLinkIcon,
  LoaderIcon,
  LockIcon,
  MailIcon,
  MenuIcon,
  MessageCircleIcon,
  MoonIcon,
  PaperclipIcon,
  PhoneIcon,
  PlayIcon,
  RemoveIcon,
  RepeatIcon,
  Repeat1Icon,
  SearchIcon,
  SettingsIcon,
  ShareIcon,
  SlashIcon,
  StarIcon,
  SunIcon,
  ThreeDotsIcon,
  TrashIcon,
  UnlockIcon,
} from './AllIcons';

const IconMeta: ComponentMeta<typeof Icon> = {
  title: 'stories/MEDIA AND ICONS/Icons',
  component: Icon,
  argTypes: {
    size: {
      control: 'select',
      options: ['xl', 'lg', 'md', 'sm', 'xs', '2xs'],
    },
    name: {
      control: 'select',
      options: [
        AddIcon,
        AlertCircleIcon,
        ArrowUpIcon,
        ArrowDownIcon,
        ArrowRightIcon,
        ArrowLeftIcon,
        AtSignIcon,
        BellIcon,
        CalendarDaysIcon,
        CheckIcon,
        CheckCircleIcon,
        ChevronUpIcon,
        ChevronDownIcon,
        ChevronLeftIcon,
        ChevronRightIcon,
        ChevronsLeftIcon,
        ChevronsRightIcon,
        ChevronsUpDownIcon,
        CircleIcon,
        ClockIcon,
        CloseIcon,
        CloseCircleIcon,
        CopyIcon,
        DownloadIcon,
        EditIcon,
        EyeIcon,
        EyeOffIcon,
        FavouriteIcon,
        GlobeIcon,
        GripVerticalIcon,
        HelpCircleIcon,
        InfoIcon,
        LinkIcon,
        ExternalLinkIcon,
        LoaderIcon,
        LockIcon,
        MailIcon,
        MenuIcon,
        MessageCircleIcon,
        MoonIcon,
        PaperclipIcon,
        PhoneIcon,
        PlayIcon,
        RemoveIcon,
        RepeatIcon,
        Repeat1Icon,
        SearchIcon,
        SettingsIcon,
        ShareIcon,
        SlashIcon,
        StarIcon,
        SunIcon,
        ThreeDotsIcon,
        TrashIcon,
        UnlockIcon,
      ],
    },
  },
  args: {
    size: 'md',
    name: AddIcon,
  },
};

export default IconMeta;
export { Icon };

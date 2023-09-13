import { styled } from '@gluestack-style/react';
import { Pressable } from 'react-native';

export default styled(
  Pressable,
  {
    justifyContent: 'center',
    alignItems: 'center',
    _web: {
      ':disabled': {
        cursor: 'not-allowed',
      },
    },
  },
  {
    componentName: 'InputIcon',
    descendantStyle: ['_icon'],
  } as const
);

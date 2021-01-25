import { mergeStyles } from '@fluentui/react';

const chatScreenContainerStyle = mergeStyles({
  height: '100%',
  width: '100%'
});

const chatScreenBottomContainerStyle = mergeStyles({
  height: '100%',
  width: '100%',
  maxHeight: '100%',
  overflow: 'auto'
});

const chatHeaderContainerStyle = mergeStyles({
  width: '100%',
  height: 'auto',
  paddingLeft: '3.25rem',
  paddingRight: '3.25rem',
  marginTop: '2rem',
  selectors: {
    '@media (max-width: 65rem)': {
      paddingLeft: '5%',
      paddingRight: '5%'
    }
  },
  borderBottom: '0.063rem solid #DDDDDD'
});

const topicNameLabelStyle = mergeStyles({
  color: '#323130',
  fontSize: '1rem', // 16px
  fontWeight: 600,
  marginRight: '0.125rem',
  width: '31.25rem',
  wordBreak: 'break-all',
  overflowY: 'hidden',
  paddingBottom: '0.5rem'
});

export { chatScreenContainerStyle, chatScreenBottomContainerStyle, chatHeaderContainerStyle, topicNameLabelStyle };

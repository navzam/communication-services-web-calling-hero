import { getTheme, IIconProps, IPivotStyles, mergeStyles } from '@fluentui/react';

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

const topicNameContainerStyle = mergeStyles({
  height: '100%',
  maxWidth: '100%',
  display: 'flex',
  alignItems: 'center',
  marginLeft: '0.625rem'
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

const greyIconButtonStyle = mergeStyles({
  color: '#323130',
  marginRight: '0.5rem'
});

const editIcon: IIconProps = {
  iconName: 'Edit'
};

const leaveIcon: IIconProps = {
  iconName: 'Leave'
};

const pivotItemStyle = mergeStyles({
  padding: '0px 13px'
});

const palette = getTheme().palette;
const pivotItemStyles: Partial<IPivotStyles> = {
  linkIsSelected: {
    padding: 0,
    marginRight: 0,
    height: '100%',
    color: palette.themePrimary,
    selectors: {
      ':hover': { color: palette.themePrimary }
    }
  },
  link: { padding: 0, marginRight: 0, height: 60 },
  root: {
    width: 84,
    height: 60,
    marginRight: '0.5rem',
    display: 'inline-block',
    verticalAlign: 'top'
  }
};

const iconButtonContainerStyle = mergeStyles({
  whiteSpace: 'nowrap',
  selectors: {
    '@media (min-width: 50rem)': {
      display: 'none'
    }
  }
});

const largeButtonContainerStyle = mergeStyles({
  whiteSpace: 'nowrap',
  selectors: {
    '@media (max-width: 50rem)': {
      display: 'none'
    }
  }
});

export {
  chatHeaderContainerStyle,
  topicNameContainerStyle,
  topicNameLabelStyle,
  greyIconButtonStyle,
  editIcon,
  leaveIcon,
  pivotItemStyle,
  pivotItemStyles,
  iconButtonContainerStyle,
  largeButtonContainerStyle
};

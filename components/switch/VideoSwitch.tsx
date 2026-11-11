import { Platform, Pressable, Switch, View } from 'react-native'
import { VideoText } from '../VideoText'
import { clsx } from '@/lib/utils'

export const VideoSwitch: React.FC<{ className?: string; label: string; value: boolean; onPress: () => void }> = ({
  className,
  label,
  value,
  onPress,
}) => {
  return (
    <View className={clsx('items-center flex-row justify-between', className)}>
      <Pressable className="flex-1" onPress={onPress}>
        <VideoText className="font-medium">{label}</VideoText>
      </Pressable>
      <Switch
        value={value}
        onValueChange={(v) => onPress()}
        trackColor={{ false: '#767577', true: '#e9d5ff' }}
        thumbColor={value ? '#6366f1' : '#f4f3f4'}
        {...Platform.select({
          web: {
            activeThumbColor: '#6366f1',
          },
        })}
      />
    </View>
  )
}

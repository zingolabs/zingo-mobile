import { Image, ImageResizeMode } from "react-native"

type LogoProps = {
    width?: number,
    height?: number,
    resizeMode?: ImageResizeMode,
    // source?: string,
}


const ZingoLogoImage: React.FunctionComponent<LogoProps> = (props) => {
    return <Image
        // can't conditionally require
        source={require('../assets/img/logobig-zingo.png')}
        style={{
            width: props.width || 80,
            height: props.height || 80,
            resizeMode: props.resizeMode || 'contain',
        }}
    />
}

export default ZingoLogoImage

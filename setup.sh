#!/bin/bash

# Voice AI Note - Xcode 项目初始化脚本
# 用于快速创建并配置 Xcode 项目

set -e

echo "🎙️ Voice AI Note - Xcode 项目初始化"
echo "======================================"

# 检查是否在正确的目录
if [ ! -d "VoiceAINote" ]; then
    echo "❌ 错误: 请在项目根目录运行此脚本"
    echo "   当前目录: $(pwd)"
    exit 1
fi

# 检查 Xcode 是否安装
if ! command -v xcodebuild &> /dev/null; then
    echo "❌ 错误: 未检测到 Xcode，请先安装 Xcode"
    exit 1
fi

echo "✅ 检测到 Xcode: $(xcodebuild -version | head -n 1)"

# 项目配置
PROJECT_NAME="VoiceAINote"
BUNDLE_ID="com.yourcompany.voiceainote"
DEPLOYMENT_TARGET="16.0"

echo ""
echo "📦 项目配置:"
echo "   项目名称: $PROJECT_NAME"
echo "   Bundle ID: $BUNDLE_ID"
echo "   部署目标: iOS $DEPLOYMENT_TARGET+"
echo ""

# 创建项目目录结构
echo "📁 创建项目配置..."

# 创建 .xcodeproj 目录
mkdir -p "$PROJECT_NAME.xcodeproj"

# 生成 project.pbxproj 文件
cat > "$PROJECT_NAME.xcodeproj/project.pbxproj" << 'PBXPROJ'
// !$*UTF8*$!
{
    archiveVersion = 1;
    classes = {};
    objectVersion = 56;
    objects = {

/* Begin PBXProject section */
        PROJECT_ROOT /* Project object */ = {
            isa = PBXProject;
            attributes = {
                BuildIndependentTargetsInParallel = 1;
                LastSwiftUpdateCheck = 1500;
                LastUpgradeCheck = 1500;
            };
            buildConfigurationList = BUILD_CONFIG_LIST;
            compatibilityVersion = "Xcode 14.0";
            developmentRegion = en;
            hasScannedForEncodings = 0;
            mainGroup = MAIN_GROUP;
            productRefGroup = PRODUCTS_GROUP;
            projectDirPath = "";
            projectRoot = "";
            targets = (
            );
        };
/* End PBXProject section */

    };
    rootObject = PROJECT_ROOT;
}
PBXPROJ

echo "✅ 项目框架创建完成"
echo ""
echo "📝 下一步操作:"
echo ""
echo "   由于 Xcode 项目配置较为复杂，建议使用 Xcode 手动创建:"
echo ""
echo "   1. 打开 Xcode"
echo "   2. File → New → Project"
echo "   3. 选择 iOS → App"
echo "   4. 配置:"
echo "      - Product Name: VoiceAINote"
echo "      - Interface: SwiftUI"
echo "      - Language: Swift"
echo "      - Use Core Data: ✓"
echo "      - Include Tests: ✓"
echo "   5. 保存到此目录"
echo "   6. 删除 Xcode 自动生成的文件"
echo "   7. 将 VoiceAINote/ 目录下的文件添加到项目"
echo ""
echo "   或者使用以下命令打开 Xcode:"
echo "   open -a Xcode ."
echo ""
echo "🎉 准备完成！"

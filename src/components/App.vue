<script lang="ts" setup>
import {ShallowRef, computed, onMounted, ref, toRefs, watch} from 'vue';
import {IconLayer} from '../core/layers/icon.layer';
import {Point} from '../core/point';
import {loadLayers, saveLayers, useSession} from '../core/session';
import {FlipperRPC} from '../flipper-rpc';
import {FlipperPlatform} from '../platforms/flipper';
import {debounce, loadImageAsync, logEvent, postParentMessage, throttle} from '../utils';
import FuiButton from './fui/FuiButton.vue';
import FuiCanvas from './fui/FuiCanvas.vue';
import FuiCode from './fui/FuiCode.vue';
import FuiFile from './fui/FuiFile.vue';
import FuiIcons from './fui/FuiIcons.vue';
import FuiInspector from './fui/FuiInspector.vue';
import FuiLayers from './fui/FuiLayers.vue';
import FuiSelectDisplay from './fui/FuiSelectDisplay/FuiSelectDisplay.vue';
import FuiSelectPlatform from './fui/FuiSelectPlatform.vue';
import FuiSelectScale from './fui/FuiSelectScale.vue';
import FuiTabs from './fui/FuiTabs.vue';
import FuiTools from './fui/FuiTools.vue';

let fuiImages = {},
    imageDataCache = {};

const fuiCanvas = ref(null),
    activeTab = ref('code');
const session = useSession();
const {editor, virtualScreen, state} = session;
const {platform, customImages} = toRefs(state);
const {updates} = toRefs(virtualScreen.state);

// computed
const isEmpty = computed(() => updates.value && session.state.layers.length === 0);
const isFlipper = computed(() => platform.value === FlipperPlatform.id);
const isSerialSupported = computed(() => window.navigator.serial !== undefined);
const flipperPreviewBtnText = computed(() => (flipper.value ? 'Disconnect' : 'Live View'));
const showCopyCode = computed(() => updates.value && session.state.layers.length > 0);

const flipper: ShallowRef<FlipperRPC> = ref(null);
let isChanged = ref(false);

watch(
    updates,
    debounce(() => {
        if (flipper.value) {
            sendFlipperImage();
        }
        isChanged.value = true;
    }, 500)
);

// methods

function setactiveTab(tab) {
    activeTab.value = tab;
}

function prepareImages(e) {
    fuiImages = e;
}

function resetScreen() {
    session.clearLayers();
    editor.setTool(null);
    logEvent('button_reset');
}

function copyCode() {
    navigator.clipboard.writeText(session.generateCode());
    logEvent('button_copy');
}

function addImageToCanvas(data) {
    session.state.layers.forEach((layer) => (layer.selected = false));
    const newLayer = new IconLayer(session.getPlatformFeatures());
    newLayer.name = data.name;
    newLayer.selected = true;
    newLayer.modifiers.icon.setValue(data.icon);
    newLayer.size = new Point(data.width, data.height);
    newLayer.updateBounds();
    newLayer.stopEdit();
    session.addLayer(newLayer);
    virtualScreen.redraw();
}

function cleanCustomIcons() {
    for (let key in fuiImages) {
        if (fuiImages[key].isCustom) {
            delete fuiImages[key];
            delete imageDataCache[key];
        }
    }
    customImages.value = [];
}

async function loadCustomImages(images: any[]) {
    for (let item of images) {
        const image = await loadImageAsync(item.url);
        customImages.value.push({
            name: item.name,
            width: image.width,
            height: image.height,
            image: image,
            isCustom: true
        });
    }
}

async function toggleFlipperPreview() {
    if (flipper.value) {
        logEvent('button_flipper', 'disconnect');
        flipperDisconnect();
    } else {
        logEvent('button_flipper', 'connect');
        const flipperRPC = new FlipperRPC();
        const isConnected = await flipperRPC.connect();
        if (isConnected) {
            flipper.value = flipperRPC;
            if (updates.value) {
                sendFlipperImage();
            }
        }
    }
}

function flipperDisconnect() {
    flipper.value.disconnect();
    flipper.value = null;
}

function sendFlipperImage() {
    flipper.value.sendImage(virtualScreen.canvasContext.getImageData(0, 0, 128, 64));
}

function saveChanges() {
    saveLayers();
    isChanged.value = false;
}

onMounted(() => {
    postParentMessage('mounted', {});
});

window.addEventListener('message', async (event) => {
    if (event.data && event.data.target === 'lopaka_app') {
        console.log('CHILD', event.data);
        switch (event.data.type) {
            case 'loadProject':
                // TODO loading project
                // move to session and provider
                session.unlock();
                await session.setPlatform(event.data.payload.library);
                const displayArr = event.data.payload.display.split('×').map((n) => parseInt(n));
                session.setDisplay(new Point(displayArr[0], displayArr[1]));
                loadLayers(event.data.payload.layers ?? []);
                loadCustomImages(event.data.payload.images);
                break;
        }
    }
});
navigator.serial?.addEventListener('disconnect', flipperDisconnect);
</script>
<template>
    <div class="fui-editor">
        <div class="fui-editor__left">
            <FuiLayers v-show="!isEmpty">
                <FuiButton v-if="!session.state.isPublic" @click="resetScreen" small danger v-show="!isEmpty">clear</FuiButton>
            </FuiLayers>
        </div>
        <div class="fui-editor__center">
            <div class="fui-editor-header">
                <FuiSelectPlatform></FuiSelectPlatform>
                <FuiSelectDisplay></FuiSelectDisplay>
                <FuiSelectScale></FuiSelectScale>
                <FuiButton
                    v-if="isFlipper && isSerialSupported"
                    @click="toggleFlipperPreview"
                    title="Connect your Flipper to USB port"
                >
                    {{ flipperPreviewBtnText }}
                </FuiButton>
                <FuiButton
                    v-if="!session.state.isPublic && isChanged"
                    @click="saveChanges"
                    title="Save changes for selected library"
                >Save</FuiButton>
            </div>
            <FuiTools v-if="!session.state.isPublic"></FuiTools>
            <FuiCanvas ref="fuiCanvas" />
            <div class="fui-editor__tools">
                <div v-if="!session.state.isPublic" class="fui-editor-header">
                    <FuiTabs :active-tab="activeTab" @set-active-tab="setactiveTab"></FuiTabs>
                </div>
                <FuiIcons
                    v-show="activeTab === 'images'"
                    :fui-images="fuiImages"
                    :custom-images="customImages"
                    @prepare-images="prepareImages"
                    @icon-clicked="addImageToCanvas"
                    @clean-custom-icons="cleanCustomIcons"
                    ref="fuiIconsList"
                ></FuiIcons>
                <FuiCode v-show="activeTab === 'code'"></FuiCode>
                <div class="buttons-bottom">
                    <FuiFile v-if="!session.state.isPublic" type="file" title="import image" @set-active-tab="setactiveTab"></FuiFile>
                    <FuiButton @click="copyCode" v-show="showCopyCode">copy code</FuiButton>
                </div>
            </div>
        </div>
        <div class="fui-editor__right">
            <FuiInspector />
        </div>
    </div>
</template>
<style lang="css">
body {
    visibility: visible !important;
}
</style>

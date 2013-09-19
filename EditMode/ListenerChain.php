<?php
/**
 * Created by JetBrains PhpStorm.
 * User: krun
 * Date: 19.09.13
 * Time: 15:08
 * To change this template use File | Settings | File Templates.
 */

namespace Hexmedia\AdministratorBundle\EditMode;


class ListenerChain {

    private static $callbacks;

    public function __construct() {
    }

    /**
     * @param string $type
     * @param function $saveCallback
     */
    public function addType($type, $saveCallback) {
        self::$callbacks[$type] = $saveCallback;
    }

    private static function getCallbacks() {
        return self::$callbacks;
    }

}
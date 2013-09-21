<?php

namespace Hexmedia\AdministratorBundle\EditMode;

class UpdaterChain {

    /**
     * @var array
     */
    private $types;

    public function __construct() {
        $this->types = [];
    }

    /**
     * @param $type
     * @param $saverClass
     * @throws \Exception
     */
    public function addType($type, $saverClass) {
        if (isset($this->types[$type])) {
            throw new \Exception("Type '" . $this->types[$type] . "' already exists.");
        }

        $this->types[$type] = $saverClass;
    }

    /**
     * @param $type
     * @return mixed
     *
     * @TODO should throw an exception
     */
    public function getType($type) {
        return $this->types[$type];
    }

}
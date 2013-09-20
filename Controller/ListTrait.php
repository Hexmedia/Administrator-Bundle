<?php

namespace Hexmedia\AdministratorBundle\Controller;

use Symfony\Component\Config\Definition\Exception\Exception;

/**
 * Trait ListTrait
 * @package Hexmedia\AdministratorBundle\Controller
 */
trait ListTrait
{
    public function prepareEntities($entities)
    {
        $i = 0;

        $fields = $this->getFieldsToDisplayOnList();

        $ret = [];

        foreach ($entities as $entity) {
            $obj = new \stdClass();

            foreach ($fields as $field => $arr) {
                if ($arr['get'] === "number") { //Number is the special one :)
                    $val = ++$i;
                } else {
                    if (is_array($arr)) {
                        $fun = $arr['get'];

                        if ($fun === "self") {
                            $val = $entity;
                        } else {
                            $val = $entity->$fun();
                        }

                        if (isset($arr['format'])) {
                            switch ($arr['format']) {
                                case "timeformat":
                                    $toCall = function ($val) {
                                        $formatter = $this->get("hexmedia.templating.helper.time_formatter");

                                        return $formatter->formatTime($val);
                                    };

                                    break;
                                case "bool":
                                    $toCall = function ($val) {
                                        return $val ? $this->get("translator")->trans("Yes") :
                                            $this->get('translator')->trans("No");
                                    };

                                    break;
                                default:
                                    $toCall = function ($val) {
                                        return $val;
                                    };
                            }
                        } else {
                            if (isset($arr['call']) && is_callable($arr['call'])) {
                                $toCall = $arr['call'];
                            } else {
                                $toCall = function ($val) {
                                    return $val;
                                };
                            }
                        }

                        if ($val == null) {
                            $val = $this->get("translator")->trans("not set");
                        } else {
                            $val = $toCall($val);
                        }

                    } else {
                        $val = $entity->$arr();
                    }
                }

                if ($val instanceof \DateTime) {
                    $val = $val->format("dd/MM/yyyy");
                } else if (is_object($val)) {
                    try {
                        $val = $val->__toString();
                    } catch (Exception $e) {
                        $val = "[object]";
                    }
                }

                $obj->$field = $val;
            }

            $ret[] = (array)$obj;
        }

        return $ret;
    }

    public abstract function getFieldsToDisplayOnList();
}